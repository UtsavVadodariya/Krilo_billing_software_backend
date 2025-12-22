const express = require('express');
const registerModels = require('../models/index');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching products for database:', databaseName);
    const { Product } = registerModels(databaseName);
    const products = await Product.find();
    console.log('Products fetched:', { count: products.length, databaseName });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch products: ' + error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Adding product for database:', databaseName);
    const { Product } = registerModels(databaseName);
    const { name, category, price, purchasePrice, stock, gst, variants } = req.body;

    // Calculate total stock if variants are provided
    let finalStock = stock;
    if (variants && Array.isArray(variants) && variants.length > 0) {
      finalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
    }

    if (!name || !category || isNaN(price) || isNaN(finalStock) || finalStock < 0 || isNaN(gst) || gst < 0) {
      throw new Error('Invalid product data: name, category, price, stock (non-negative), and gst (non-negative) are required');
    }
    const product = new Product({ name, category, price, purchasePrice: purchasePrice || 0, stock: finalStock, gst, variants });
    await product.save();
    console.log('Product added:', { name, stock, gst, databaseName });
    res.json(product);
  } catch (error) {
    console.error('Error adding product:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to add product: ' + error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Updating product for database:', databaseName);
    const { Product } = registerModels(databaseName);
    const { name, category, price, purchasePrice, stock, gst, variants } = req.body;

    // Calculate total stock if variants are provided
    let finalStock = stock;
    if (variants && Array.isArray(variants) && variants.length > 0) {
      finalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
    }

    if (!name || !category || isNaN(price) || isNaN(finalStock) || finalStock < 0 || isNaN(gst) || gst < 0) {
      throw new Error('Invalid product data: name, category, price, stock (non-negative), and gst (non-negative) are required');
    }
    console.log('Received update payload:', { id: req.params.id, name, category, price, purchasePrice, finalStock, gst, variants });
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { name, category, price, purchasePrice: purchasePrice || 0, stock: finalStock, gst, variants } },
      { new: true, runValidators: true }
    );
    if (!product) {
      throw new Error('Product not found');
    }
    console.log('Product updated:', { id: req.params.id, name, stock, gst, databaseName });
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', { error: error.message, databaseName: req.databaseName, body: req.body });
    res.status(500).json({ error: 'Failed to update product: ' + error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Deleting product for database:', databaseName);
    const { Product } = registerModels(databaseName);
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      throw new Error('Product not found');
    }
    console.log('Product deleted:', { id: req.params.id, name: product.name, databaseName });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  }
});

module.exports = router;