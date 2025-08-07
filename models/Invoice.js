// models/invoiceSchema.js

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
  },
  customer: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['sales_invoice', 'purchase_invoice', 'quotation', 'sales_order'],
    required: [true, 'Invoice type is required'],
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  }],
  quantities: [{
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
  }],
  prices: [{
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
  }],
  discounts: [{
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  }],
  gstAmounts: [{
    type: Number,
    default: 0,
    min: [0, 'GST amount cannot be negative'],
  }],
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative'],
  },
  grandTotalDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Grand total discount cannot be negative'],
  },
  totalReceived: {
    type: Number,
    min: [0, 'Total received cannot be negative'],
    default: null,
  },
  totalPendingAmount: {
    type: Number,
    min: [0, 'Total pending amount cannot be negative'],
    default: function () {
      return this.totalReceived !== null ? this.total - this.totalReceived : null;
    },
  },
  date: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = invoiceSchema;