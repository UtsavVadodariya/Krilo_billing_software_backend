const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['product', 'invoice', 'account'] },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = (collectionName) => mongoose.connection.model('Data', dataSchema, collectionName);