const express = require('express');
const { Account, Invoice } = require('../models_sql/index'); // SQL Models
const router = express.Router();

// GET all accounts
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) throw new Error('User ID not provided');

    console.log('Fetching accounts for userId:', userId);

    const accounts = await Account.findAll({
      where: { a_application_login_id: userId },
      include: [{ model: Invoice }], // Include Invoice details
      order: [['date', 'DESC']]
    });

    console.log('Accounts fetched:', { count: accounts.length, userId });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch accounts: ' + error.message });
  }
});

// POST create a new account entry
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) throw new Error('User ID not provided');

    console.log('Adding account entry for userId:', userId);

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

    const account = await Account.create({
      a_application_login_id: userId,
      accountType: req.body.accountType,
      type: req.body.type || 'debit', // Default to debit? Check Mongo schema default.
      amount,
      description: req.body.description,
      date: req.body.date || new Date(),
      invoiceId: req.body.invoiceId || null // Optional link
    });

    console.log('Account entry added:', { description: req.body.description, accountType: req.body.accountType, userId });
    res.json(account);
  } catch (error) {
    console.error('Error adding account entry:', { error: error.message, userId: req.userId });
    res.status(400).json({ error: 'Failed to add account entry: ' + error.message });
  }
});

module.exports = router;