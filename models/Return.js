const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
    originalInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: { // Price at which it was originally sold
            type: Number,
            required: true
        },
        reason: {
            type: String,
            default: 'Defective/Exchange'
        }
    }],
    totalRefundAmount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        enum: ['cash_refund', 'credit_note'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = returnSchema;
