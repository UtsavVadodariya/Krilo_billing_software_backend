const express = require('express');
const registerModels = require('../models/index');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const databaseName = req.databaseName; // Set by auth middleware
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching accounts for database:', databaseName);
    const { Account } = registerModels(databaseName);
    console.log('Account model retrieved for:', databaseName);
    const accounts = await Account.find().populate('invoiceId');
    console.log('Accounts fetched:', { count: accounts.length, databaseName });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch accounts: ' + error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const databaseName = req.databaseName; // Set by auth middleware
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Adding account entry for database:', databaseName);
    const { Account } = registerModels(databaseName);
    console.log('Account model retrieved for:', databaseName);

    // Validate accountType
    const validAccountTypes = ['Accounts Receivable', 'Sales Revenue', 'Cash', 'Expenses'];
    if (!req.body.accountType || !validAccountTypes.includes(req.body.accountType)) {
      throw new Error('Invalid or missing accountType. Must be one of: ' + validAccountTypes.join(', '));
    }

    // Validate amount
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0 || amount > 1000000) {
      throw new Error('Invalid amount. Must be between ₹1 and ₹10,00,000.');
    }

    const account = new Account({
      ...req.body,
      amount,
      date: req.body.date || new Date(),
    });
    await account.save();
    console.log('Account entry added:', { description: req.body.description, accountType: req.body.accountType, databaseName });
    res.json(account);
  } catch (error) {
    console.error('Error adding account entry:', { error: error.message, databaseName: req.databaseName });
    res.status(400).json({ error: 'Failed to add account entry: ' + error.message });
  }
});

module.exports = router;