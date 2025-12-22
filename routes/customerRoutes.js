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

    const { name, mobileNumber, address, country, state, city, pincode, GSTIN } = req.body;
    if (!name || !mobileNumber) {
      throw new Error('Name and mobile number are required');
    }

    const customer = new Customer({
      name,
      mobileNumber,
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

// PUT update a customer
router.put('/:id', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) throw new Error('Database name not provided');
    const { Customer } = registerModels(databaseName);

    const { name, mobileNumber, address, country, state, city, pincode, GSTIN } = req.body;

    // Check if mobile number is provided if it's being updated
    if (req.body.mobileNumber === '') {
      throw new Error('Mobile number cannot be empty');
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        name,
        mobileNumber,
        address,
        country,
        state,
        city,
        pincode,
        GSTIN
      },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    console.log('Customer updated:', { id: req.params.id, databaseName });
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', { error: error.message, databaseName: req.databaseName });
    res.status(400).json({ error: 'Failed to update customer: ' + error.message });
  }
});

// DELETE a customer
router.delete('/:id', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) throw new Error('Database name not provided');
    const { Customer } = registerModels(databaseName);

    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    console.log('Customer deleted:', { id: req.params.id, databaseName });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to delete customer: ' + error.message });
  }
});

module.exports = router;