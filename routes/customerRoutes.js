const express = require('express');
const { Customer } = require('../models_sql/index'); // SQL Model
const router = express.Router();

// GET all customers
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new Error('User ID not provided');
    }
    console.log('Fetching customers for userId:', userId);

    const customers = await Customer.findAll({
      where: { a_application_login_id: userId },
      order: [['createdAt', 'DESC']]
    });

    console.log('Customers fetched:', { count: customers.length, userId });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch customers: ' + error.message });
  }
});

// POST create a new customer
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new Error('User ID not provided');
    }
    console.log('Adding customer for userId:', userId);

    const { name, mobileNumber, address, country, state, city, pincode, GSTIN } = req.body;
    if (!name || !mobileNumber) {
      throw new Error('Name and mobile number are required');
    }

    const customer = await Customer.create({
      a_application_login_id: userId,
      name,
      mobileNumber,
      address,
      country,
      state,
      city,
      pincode,
      GSTIN: GSTIN || '',
    });

    console.log('Customer added:', { name, userId });
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error adding customer:', { error: error.message, userId: req.userId });
    res.status(400).json({ error: 'Failed to add customer: ' + error.message });
  }
});

// PUT update a customer
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const { name, mobileNumber, address, country, state, city, pincode, GSTIN } = req.body;

    // Check if mobile number is provided if it's being updated
    if (req.body.mobileNumber === '') {
      throw new Error('Mobile number cannot be empty');
    }

    const customer = await Customer.findOne({ where: { id, a_application_login_id: userId } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customer.update({
      name,
      mobileNumber,
      address,
      country,
      state,
      city,
      pincode,
      GSTIN
    });

    console.log('Customer updated:', { id, userId });
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', { error: error.message, userId: req.userId });
    res.status(400).json({ error: 'Failed to update customer: ' + error.message });
  }
});

// DELETE a customer
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const customer = await Customer.findOne({ where: { id, a_application_login_id: userId } });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await customer.destroy();

    console.log('Customer deleted:', { id, userId });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to delete customer: ' + error.message });
  }
});

module.exports = router;