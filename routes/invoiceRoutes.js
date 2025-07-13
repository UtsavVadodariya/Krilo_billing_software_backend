const express = require('express');
const mongoose = require('mongoose');
const registerModels = require('../models/index');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching invoices for database:', databaseName);
    const { Invoice } = registerModels(databaseName);
    const invoices = await Invoice.find().populate('products', 'name price');
    console.log('Invoices fetched:', { count: invoices.length, databaseName });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch invoices: ' + error.message });
  }
});

router.get('/sales_invoice', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching all invoices for database:', databaseName);
    const { Invoice } = registerModels(databaseName);
    const invoices = await Invoice.find().populate('products', 'name price');
    console.log('All invoices fetched:', { count: invoices.length, databaseName });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching all invoices:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch all invoices: ' + error.message });
  }
});

router.get('/customer', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    const { customerName } = req.query;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log(`Fetching invoices for database: ${databaseName}, customer: ${customerName || 'all'}`);
    const { Invoice } = registerModels(databaseName);
    if (!Invoice) {
      throw new Error('Invoice model not registered');
    }
    const query = customerName ? { customer: new RegExp(customerName.trim(), 'i') } : {};
    const invoices = await Invoice.find(query).populate('products', 'name price');
    console.log(`Invoices fetched:`, { count: invoices.length, databaseName, customer: customerName || 'all' });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching customer invoices:', { 
      error: error.message, 
      databaseName: req.databaseName, 
      customerName,
      stack: error.stack 
    });
    res.status(500).json({ error: 'Failed to fetch customer invoices: ' + error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Adding invoice for database:', databaseName);
    console.log('Received payload:', req.body);
    const { Product, Invoice, Account } = registerModels(databaseName);

    const { customer, type, products: productIds, quantities, total, totalReceived } = req.body;

    // Validate payload
    if (!customer || typeof customer !== 'string' || !customer.trim()) {
      throw new Error('Invalid request: Customer name is required');
    }
    if (!type || !['quotation', 'sales_order', 'sales_invoice', 'purchase_invoice'].includes(type)) {
      throw new Error('Invalid request: Invalid invoice type');
    }
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('Invalid request: Products array is required and cannot be empty');
    }
    if (!Array.isArray(quantities) || quantities.length === 0 || productIds.length !== quantities.length) {
      throw new Error(`Invalid request: Quantities array must match products array (received ${quantities.length} quantities, expected ${productIds.length})`);
    }

    const parsedTotal = parseFloat(total);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      throw new Error('Invalid request: Total amount must be a positive number');
    }

    const parsedQuantities = quantities.map((q) => {
      const parsed = parseInt(q, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error('Invalid request: All quantities must be positive integers');
      }
      return parsed;
    });

    const parsedTotalReceived = totalReceived !== undefined && totalReceived !== null && totalReceived !== '' ? parseFloat(totalReceived) : 0;
    if (parsedTotalReceived < 0) {
      throw new Error('Invalid request: Total received cannot be negative');
    }
    if (parsedTotalReceived > parsedTotal) {
      throw new Error('Invalid request: Total received cannot exceed total amount');
    }

    const totalPendingAmount = parsedTotal - parsedTotalReceived;

    // Validate product IDs
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      throw new Error(`Invalid request: One or more products not found (found ${products.length}, expected ${productIds.length})`);
    }

    // Validate stock for sales_invoice
    if (type === 'sales_invoice') {
      for (let i = 0; i < productIds.length; i++) {
        const product = products.find((p) => p._id.toString() === productIds[i]);
        if (!product) {
          throw new Error(`Invalid request: Product not found: ${productIds[i]}`);
        }
        if (product.stock < parsedQuantities[i]) {
          throw new Error(`Insufficient stock for ${product.name}: ${product.stock} available, ${parsedQuantities[i]} requested`);
        }
      }
    }

    // Update product stock
    for (let i = 0; i < productIds.length; i++) {
      const product = products.find((p) => p._id.toString() === productIds[i]);
      const quantity = parsedQuantities[i];
      if (type === 'sales_invoice') {
        await Product.findByIdAndUpdate(
          product._id,
          { $inc: { stock: -quantity } },
          { runValidators: true }
        );
        console.log(`Stock decreased for ${product.name}: -${quantity}, new stock: ${product.stock - quantity}`);
      } else if (type === 'purchase_invoice') {
        await Product.findByIdAndUpdate(
          product._id,
          { $inc: { stock: quantity } },
          { runValidators: true }
        );
        console.log(`Stock increased for ${product.name}: +${quantity}, new stock: ${product.stock + quantity}`);
      }
    }

    // Create invoice
    const invoice = new Invoice({
      customer: customer.trim(),
      type,
      products: productIds,
      quantities: parsedQuantities,
      total: parsedTotal,
      totalReceived: parsedTotalReceived,
      totalPendingAmount,
      date: new Date(),
    });
    await invoice.save();
    console.log('Invoice created:', { 
      customer, 
      type, 
      total: parsedTotal, 
      quantities: parsedQuantities,
      totalReceived: parsedTotalReceived, 
      totalPendingAmount, 
      databaseName 
    });

    // Create account entries for sales_invoice
    if (type === 'sales_invoice') {
      const accountEntries = [];
      if (totalReceived === null || totalReceived === undefined) {
        // No payment details: credit full total to Accounts Receivable
        accountEntries.push({
          accountType: 'Accounts Receivable',
          type: 'credit',
          amount: parsedTotal,
          invoiceId: invoice._id,
          description: `Sales Invoice for ${customer}`,
          date: invoice.date,
        });
      } else if (parsedTotalReceived > 0) {
        // Payment details provided: credit and debit totalReceived
        accountEntries.push(
          {
            accountType: 'Accounts Receivable',
            type: 'credit',
            amount: parsedTotalReceived,
            invoiceId: invoice._id,
            description: `Sales Invoice payment for ${customer}`,
            date: invoice.date,
          },
          {
            accountType: 'Accounts Receivable',
            type: 'debit',
            amount: parsedTotalReceived,
            invoiceId: invoice._id,
            description: `Payment received for ${customer}`,
            date: invoice.date,
          }
        );
      }
      if (accountEntries.length > 0) {
        await Account.insertMany(accountEntries);
        console.log('Account entries created for sales invoice:', { invoiceId: invoice._id, entries: accountEntries });
      }
    } else if (type === 'purchase_invoice') {
      const accountEntries = [
        {
          accountType: 'Purchase Revenue',
          type: 'debit',
          amount: parsedTotal,
          invoiceId: invoice._id,
          description: `Purchase Invoice for ${customer}`,
          date: invoice.date,
        },
      ];
      await Account.insertMany(accountEntries);
      console.log('Account entries created for purchase invoice:', { invoiceId: invoice._id });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', { error: error.message, databaseName: req.databaseName, body: req.body });
    res.status(500).json({ error: 'Failed to create invoice: ' + error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Updating invoice for database:', databaseName);
    console.log('Received payload:', req.body);
    const { Invoice, Account } = registerModels(databaseName);
    const { totalReceived } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const parsedTotalReceived = totalReceived !== undefined && totalReceived !== '' ? parseFloat(totalReceived) : invoice.totalReceived;
    if (isNaN(parsedTotalReceived) || parsedTotalReceived < 0) {
      throw new Error('Invalid request: Total received must be a non-negative number');
    }
    if (parsedTotalReceived > invoice.total) {
      throw new Error('Invalid request: Total received cannot exceed total amount');
    }

    const additionalReceived = parsedTotalReceived - invoice.totalReceived;
    const totalPendingAmount = invoice.total - parsedTotalReceived;

    invoice.totalReceived = parsedTotalReceived;
    invoice.totalPendingAmount = totalPendingAmount;
    await invoice.save();
    console.log('Invoice updated:', { 
      id: invoice._id, 
      totalReceived: parsedTotalReceived, 
      totalPendingAmount, 
      databaseName 
    });

    // Create account entry for additional payment
    if (additionalReceived > 0 && invoice.type === 'sales_invoice') {
      const accountEntry = {
        accountType: 'Accounts Receivable',
        type: 'debit',
        amount: additionalReceived,
        invoiceId: invoice._id,
        description: `Additional payment received for ${invoice.customer}`,
        date: new Date(),
      };
      await Account.create(accountEntry);
      console.log('Account entry created for additional payment:', { invoiceId: invoice._id, amount: additionalReceived });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', { error: error.message, databaseName: req.databaseName, body: req.body });
    res.status(500).json({ error: 'Failed to update invoice: ' + error.message });
  }
});

module.exports = router;