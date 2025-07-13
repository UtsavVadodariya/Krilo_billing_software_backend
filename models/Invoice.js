const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  customer: { type: String, required: true },
  type: { type: String, required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  total: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = invoiceSchema