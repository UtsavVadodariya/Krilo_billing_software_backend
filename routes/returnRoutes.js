const express = require('express');
const registerModels = require('../models/index');
const router = express.Router();

// GET all returns
router.get('/', async (req, res) => {
    try {
        const databaseName = req.databaseName;
        if (!databaseName) throw new Error('Database name not provided');

        const { Return } = registerModels(databaseName);
        const returns = await Return.find()
            .populate('customerId', 'name mobileNumber')
            .populate('originalInvoiceId', 'invoiceNumber')
            .sort({ date: -1 });

        res.json(returns);
    } catch (error) {
        console.error('Error fetching returns:', error);
        res.status(500).json({ error: 'Failed to fetch returns: ' + error.message });
    }
});

// POST create a return
router.post('/', async (req, res) => {
    try {
        const databaseName = req.databaseName;
        if (!databaseName) throw new Error('Database name not provided');

        const { Return, Product, Account, Customer, Invoice } = registerModels(databaseName);
        const { originalInvoiceId, customerId, products, totalRefundAmount, type, date } = req.body;

        // 0. Validate if invoice exists and fetch it for quantity checks
        const invoice = await Invoice.findById(originalInvoiceId);
        if (!invoice) {
            return res.status(404).json({ error: 'Original invoice not found' });
        }

        // Fetch all previous returns for this invoice
        const existingReturns = await Return.find({ originalInvoiceId });

        // Calculate previously returned quantities per product (and size)
        const previouslyReturnedMap = {}; // { "productId-size": totalReturnedQty }
        existingReturns.forEach(ret => {
            ret.products.forEach(item => {
                const pId = item.productId.toString();
                const size = item.size ? item.size.toString() : 'N/A';
                const key = `${pId}-${size}`;
                previouslyReturnedMap[key] = (previouslyReturnedMap[key] || 0) + item.quantity;
            });
        });

        // Validate each item in the current request
        for (const item of products) {
            const pId = item.productId.toString();
            const itemSize = item.size ? item.size.toString() : 'N/A';
            const key = `${pId}-${itemSize}`;

            // Calculate original purchased quantity for this specific product ID AND Size
            let originalQty = 0;
            if (invoice.products && invoice.quantities) {
                invoice.products.forEach((invProdId, index) => {
                    if (invProdId.toString() === pId) {
                        // Check if sizes match
                        const invSize = (invoice.sizes && invoice.sizes[index]) ? invoice.sizes[index].toString() : 'N/A';
                        if (invSize === itemSize) {
                            originalQty += invoice.quantities[index];
                        }
                    }
                });
            }

            if (originalQty === 0) {
                return res.status(400).json({ error: `Product ${item.productId} (Size: ${item.size || 'N/A'}) not found in original invoice` });
            }

            const previouslyReturnedQty = previouslyReturnedMap[key] || 0;
            const remainingQty = originalQty - previouslyReturnedQty;

            if (item.quantity > remainingQty) {
                return res.status(400).json({
                    error: `Cannot return ${item.quantity} of product. Only ${remainingQty} remaining from original purchase (Size: ${item.size || 'N/A'}).`
                });
            }
        }

        // 1. Create Return Record
        // Ensure size is included in the stored product objects
        // The item object in 'products' array from req.body should already have it, 
        // but we can map explicitly to be safe if strictly picking fields.
        // Mongoose schema will pick it up if present.

        const returnRecord = new Return({
            originalInvoiceId,
            customerId,
            products,
            totalRefundAmount,
            type,
            date: date || new Date()
        });
        await returnRecord.save();

        // 2. Update Inventory (Increase Stock)
        for (const item of products) {
            if (!item.productId) continue;

            const product = await Product.findById(item.productId);
            if (product) {
                // If the item had a specific variant size (not passed in generic structure but for future)
                // For now, if we don't have explicit size-based stock management in Product model, 
                // we just increment main stock.
                // TODO: If Product model supports sizes array with stock, find and increment that specific size.

                // Check if product has sizes array in its schema (assuming standard Krilo structure)
                // If it does, find index and increment.
                if (item.size && product.sizes && Array.isArray(product.sizes)) {
                    const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
                    if (sizeIndex !== -1) {
                        // Careful: product.sizes might be objects [{size: 'M', quantity: 10}] or strings.
                        // Checking standard Product.js... usually it's array of objects for stock.
                        // Let's assume standard behavior: update both global stock and variant stock if structure exists.
                        if (product.sizes[sizeIndex].quantity !== undefined) {
                            product.sizes[sizeIndex].quantity += parseInt(item.quantity);
                        }
                    }
                }

                product.stock += parseInt(item.quantity);
                await product.save();
            }
        }

        // 3. Update Accounts (Financial Impact)
        if (type === 'credit_note') {
            // Update Customer Credit Balance
            if (customerId) {
                await Customer.findByIdAndUpdate(customerId, {
                    $inc: { creditBalance: totalRefundAmount }
                });
            }
        } else if (type === 'cash_refund') {
            const refundEntry = new Account({
                accountType: 'Sales Return Refund',
                type: 'debit', // Money Out
                amount: totalRefundAmount,
                date: date || new Date(),
                invoiceId: originalInvoiceId,
                description: `Refund for Return`
            });
            await refundEntry.save();
        }

        res.status(201).json(returnRecord);
    } catch (error) {
        console.error('Error creating return:', error);
        res.status(400).json({ error: 'Failed to create return: ' + error.message });
    }
});

module.exports = router;
