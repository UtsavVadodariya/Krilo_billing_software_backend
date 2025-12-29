const express = require('express');
const { Return, ReturnItem, Product, ProductVariant, Account, Customer, Invoice, InvoiceItem } = require('../models_sql/index'); // SQL Models
const router = express.Router();

// GET all returns
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) throw new Error('User ID not provided');

        const returns = await Return.findAll({
            where: { a_application_login_id: userId },
            include: [
                { model: Customer, attributes: ['name', 'mobileNumber'] },
                { model: Invoice, attributes: ['invoiceNumber'] },
                {
                    model: ReturnItem,
                    as: 'items',
                    include: [{ model: Product, attributes: ['name'] }]
                }
            ],
            order: [['date', 'DESC']]
        });

        res.json(returns);
    } catch (error) {
        console.error('Error fetching returns:', error);
        res.status(500).json({ error: 'Failed to fetch returns: ' + error.message });
    }
});

// POST create a return
router.post('/', async (req, res) => {
    const transaction = await Return.sequelize.transaction();
    try {
        const userId = req.userId;
        if (!userId) throw new Error('User ID not provided');

        const { originalInvoiceId, customerId, products, totalRefundAmount, type, date } = req.body;

        // 0. Validate Invoice
        const invoice = await Invoice.findOne({
            where: { id: originalInvoiceId, a_application_login_id: userId },
            include: [{ model: InvoiceItem, as: 'items' }],
            transaction
        });

        if (!invoice) {
            throw new Error('Original invoice not found');
        }

        // Fetch previous returns for this invoice to calculate remaining returnable items
        const existingReturns = await Return.findAll({
            where: { originalInvoiceId },
            include: [{ model: ReturnItem, as: 'items' }],
            transaction
        });

        // Map previously returned quantities: { "productId-size": qty }
        const previouslyReturnedMap = {};
        existingReturns.forEach(ret => {
            if (ret.items) {
                ret.items.forEach(item => {
                    const key = `${item.productId}-${item.size || 'N/A'}`;
                    previouslyReturnedMap[key] = (previouslyReturnedMap[key] || 0) + item.quantity;
                });
            }
        });

        // Validate Items
        for (const item of products) {
            const pId = item.productId;
            const itemSize = item.size || 'N/A';
            const key = `${pId}-${itemSize}`;

            // Find item in original invoice
            // Note: InvoiceItems in SQL are distinct rows. We filter by productId and size.
            // Items might be duplicated if same product/size added twice? Unlikely in standard flow but possible.
            // Sum up matching invoice lines.
            const invoiceItems = invoice.items.filter(invItem =>
                invItem.productId == pId && (invItem.size || 'N/A') === itemSize
            );

            const originalQty = invoiceItems.reduce((sum, i) => sum + i.quantity, 0);

            if (originalQty === 0) {
                throw new Error(`Product ${pId} (Size: ${itemSize}) not found in original invoice`);
            }

            const previouslyReturnedQty = previouslyReturnedMap[key] || 0;
            const remainingQty = originalQty - previouslyReturnedQty;

            if (item.quantity > remainingQty) {
                throw new Error(`Cannot return ${item.quantity}. Only ${remainingQty} remaining for Product ${pId} (Size: ${itemSize}).`);
            }
        }

        // 1. Create Return Record
        const returnRecord = await Return.create({
            a_application_login_id: userId,
            originalInvoiceId,
            customerId,
            totalRefundAmount,
            type, // 'cash_refund' or 'credit_note'
            date: date || new Date()
        }, { transaction });

        // Create Return Items
        for (const item of products) {
            await ReturnItem.create({
                returnId: returnRecord.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                reason: item.reason || 'Defective/Exchange',
                size: item.size
            }, { transaction });
        }

        // 2. Update Inventory (Increase Stock)
        for (const item of products) {
            const qty = parseInt(item.quantity);

            // Update Variant Stock if size exists
            if (item.size) {
                const variant = await ProductVariant.findOne({
                    where: { productId: item.productId, size: item.size },
                    transaction
                });
                if (variant) {
                    variant.stock += qty;
                    await variant.save({ transaction });
                }
            }

            // Update Main Product Stock
            const product = await Product.findByPk(item.productId, { transaction });
            if (product) {
                product.stock += qty;
                await product.save({ transaction });
            }
        }

        // 3. Update Accounts (Financial Impact)
        if (type === 'credit_note') {
            // Update Customer Credit Balance
            if (customerId) {
                const customerMap = await Customer.findByPk(customerId, { transaction });
                if (customerMap) {
                    customerMap.creditBalance += parseFloat(totalRefundAmount);
                    await customerMap.save({ transaction });
                }
            }
        } else if (type === 'cash_refund') {
            await Account.create({
                a_application_login_id: userId,
                invoiceId: originalInvoiceId,
                accountType: 'Sales Return Refund',
                type: 'debit', // Money Out
                amount: totalRefundAmount,
                date: date || new Date(),
                description: `Refund for Return - Inv #${invoice.invoiceNumber}`
            }, { transaction });
        }

        await transaction.commit();
        res.status(201).json(returnRecord);

    } catch (error) {
        await transaction.rollback();
        console.error('Error creating return:', error);
        res.status(400).json({ error: 'Failed to create return: ' + error.message });
    }
});

module.exports = router;
