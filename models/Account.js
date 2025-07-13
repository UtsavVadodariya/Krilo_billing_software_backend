const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountType: { type: String, required: true }, // e.g., 'Accounts Receivable', 'Sales Revenue'
  type: { type: String, required: true, enum: ['debit', 'credit'] },
  amount: { type: Number, required: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  date: { type: Date, default: Date.now },
});

module.exports = accountSchema;