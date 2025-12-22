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

        // Calculate previously returned quantities per product
        const previouslyReturnedMap = {}; // { productId: totalReturnedQty }
        existingReturns.forEach(ret => {
            ret.products.forEach(item => {
                const pId = item.productId.toString();
                previouslyReturnedMap[pId] = (previouslyReturnedMap[pId] || 0) + item.quantity;
            });
        });

        // Validate each item in the current request
        for (const item of products) {
            const pId = item.productId.toString();

            // Find original purchased quantity
            const originalProductIndex = invoice.products.findIndex(p => p.toString() === pId);
            if (originalProductIndex === -1) {
                return res.status(400).json({ error: `Product ${item.productId} not found in original invoice` });
            }
            const originalQty = invoice.quantities[originalProductIndex];

            const previouslyReturnedQty = previouslyReturnedMap[pId] || 0;
            const remainingQty = originalQty - previouslyReturnedQty;

            if (item.quantity > remainingQty) {
                return res.status(400).json({
                    error: `Cannot return ${item.quantity} of product. Only ${remainingQty} remaining from original purchase.`
                });
            }
        }

        // 1. Create Return Record
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
                // If it was a generic product update stock
                product.stock += item.quantity;

                // If the item had a specific variant size (not passed in generic structure but for future)
                // logic for variants would go here. For now assuming main referencing.

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
