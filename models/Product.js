const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  purchasePrice: { type: Number, required: true, default: 0 },
  stock: { type: Number, required: true, min: 0 },
  gst: { type: Number, required: true, min: 0, default: 0 },
  description: { type: String },
  variants: [{
    size: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    price: { type: Number, min: 0 }, // Variant specific selling price
    purchasePrice: { type: Number, min: 0 } // Variant specific buying price
  }]
});
module.exports = productSchema;