const express = require('express');
const { Product, ProductVariant } = require('../models_sql/index'); // SQL Models
const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new Error('User ID not provided');
    }
    console.log('Fetching products for userId:', userId);

    const products = await Product.findAll({
      where: { a_application_login_id: userId },
      include: [{
        model: ProductVariant,
        as: 'variants'
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log('Products fetched:', { count: products.length, userId });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch products: ' + error.message });
  }
});

// POST create a new product
router.post('/', async (req, res) => {
  const transaction = await Product.sequelize.transaction();
  try {
    const userId = req.userId;
    if (!userId) throw new Error('User ID not provided');

    console.log('Adding product for userId:', userId);
    const { name, category, price, purchasePrice, stock, gst, variants, description } = req.body;

    // Calculate total stock if variants are provided
    let finalStock = stock;
    if (variants && Array.isArray(variants) && variants.length > 0) {
      finalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
    }

    if (!name || !category || isNaN(price) || isNaN(finalStock) || finalStock < 0 || isNaN(gst) || gst < 0) {
      throw new Error('Invalid product data: name, category, price, stock (non-negative), and gst (non-negative) are required');
    }

    // Create Product
    const product = await Product.create({
      a_application_login_id: userId,
      name,
      category,
      price,
      purchasePrice: purchasePrice || 0,
      stock: finalStock,
      gst,
      description
    }, { transaction });

    // Create Variants if any
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        await ProductVariant.create({
          productId: product.id,
          size: v.size,
          stock: parseInt(v.stock) || 0,
          price: parseFloat(v.price) || price, // Fallback to main price if not specified
          purchasePrice: parseFloat(v.purchasePrice) || (purchasePrice || 0)
        }, { transaction });
      }
    }

    await transaction.commit();

    // Fetch created product with variants
    const newProduct = await Product.findByPk(product.id, {
      include: [{ model: ProductVariant, as: 'variants' }]
    });

    console.log('Product added:', { name, stock: finalStock, gst, userId });
    res.json(newProduct);

  } catch (error) {
    await transaction.rollback();
    console.error('Error adding product:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to add product: ' + error.message });
  }
});

// PUT update a product
router.put('/:id', async (req, res) => {
  const transaction = await Product.sequelize.transaction();
  try {
    const userId = req.userId;
    console.log('Updating product for userId:', userId);

    const { name, category, price, purchasePrice, stock, gst, variants, description } = req.body;

    // Calculate total stock if variants are provided
    let finalStock = stock;
    if (variants && Array.isArray(variants) && variants.length > 0) {
      finalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
    }

    if (!name || !category || isNaN(price) || isNaN(finalStock) || finalStock < 0 || isNaN(gst) || gst < 0) {
      throw new Error('Invalid product data: name, category, price, stock (non-negative), and gst (non-negative) are required');
    }

    const product = await Product.findOne({ where: { id: req.params.id, a_application_login_id: userId } });
    if (!product) {
      throw new Error('Product not found');
    }

    // Update Product fields
    await product.update({
      name,
      category,
      price,
      purchasePrice: purchasePrice || 0,
      stock: finalStock,
      gst,
      description
    }, { transaction });

    // Handle Variants Update (Strategy: Delete existing and re-create for simplicity, or upsert)
    // Re-creating is safer to ensure sync with frontend array
    await ProductVariant.destroy({ where: { productId: product.id }, transaction });

    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        await ProductVariant.create({
          productId: product.id,
          size: v.size,
          stock: parseInt(v.stock) || 0,
          price: parseFloat(v.price) || price,
          purchasePrice: parseFloat(v.purchasePrice) || (purchasePrice || 0)
        }, { transaction });
      }
    }

    await transaction.commit();

    const updatedProduct = await Product.findByPk(product.id, {
      include: [{ model: ProductVariant, as: 'variants' }]
    });

    console.log('Product updated:', { id: req.params.id, name, stock: finalStock, gst, userId });
    res.json(updatedProduct);

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating product:', { error: error.message, userId: req.userId, body: req.body });
    res.status(500).json({ error: 'Failed to update product: ' + error.message });
  }
});

// DELETE a product
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Deleting product for userId:', userId);

    const product = await Product.findOne({ where: { id: req.params.id, a_application_login_id: userId } });

    if (!product) {
      throw new Error('Product not found');
    }

    await product.destroy(); // Cascade deletes variants

    console.log('Product deleted:', { id: req.params.id, name: product.name, userId });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  }
});

module.exports = router;