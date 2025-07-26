const express = require('express');
const registerModels = require('../models/index');
const router = express.Router();

// GET all customers
router.get('/', async (req, res) => {
  try {
    const databaseName = req.databaseName; // Set by auth middleware
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching customers for database:', databaseName);
    const { Customer } = registerModels(databaseName);
    console.log('Customer model retrieved for:', databaseName);
    const customers = await Customer.find().select('-__v');
    console.log('Customers fetched:', { count: customers.length, databaseName });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch customers: ' + error.message });
  }
});

// POST create a new customer
router.post('/', async (req, res) => {
  try {
    const databaseName = req.databaseName; // Set by auth middleware
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Adding customer for database:', databaseName);
    const { Customer } = registerModels(databaseName);
    console.log('Customer model retrieved for:', databaseName);

    const { name, address, country, state, city, pincode, GSTIN } = req.body;
    if (!name || !address || !country || !state || !city || !pincode) {
      throw new Error('All required fields must be provided');
    }

    const customer = new Customer({
      name,
      address,
      country,
      state,
      city,
      pincode,
      GSTIN: GSTIN || '',
    });
    await customer.save();
    console.log('Customer added:', { name, databaseName });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error adding customer:', { error: error.message, databaseName: req.databaseName });
    res.status(400).json({ error: 'Failed to add customer: ' + error.message });
  }
});

module.exports = router;