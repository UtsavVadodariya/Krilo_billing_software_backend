const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  customer: { type: String, required: true },
  type: { type: String, required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  quantities: [{ type: Number, required: true }],
  total: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  totalReceived: { type: Number, default: 0 },
  totalPendingAmount: { type: Number, default: function() { return this.total; } },});

module.exports = invoiceSchema