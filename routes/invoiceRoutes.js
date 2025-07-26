const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const registerModels = require('../models/index');

// Update these routes in your invoices router

router.get('/', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching invoices for database:', databaseName);
    const { Invoice } = registerModels(databaseName);
    const invoices = await Invoice.find()
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v')
      .sort({ createdAt: -1, _id: -1 }); // Sort by createdAt descending, then by _id descending as fallback
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
    console.log('Fetching sales invoices for database:', databaseName);
    const { Invoice } = registerModels(databaseName);
    const invoices = await Invoice.find({ type: 'sales_invoice' })
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v')
      .sort({ createdAt: -1, _id: -1 }); // Sort by createdAt descending
    console.log('Sales invoices fetched:', { count: invoices.length, databaseName });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching sales invoices:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch sales invoices: ' + error.message });
  }
});

router.get('/customer', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    const { customerName, customerId } = req.query;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log(`Fetching invoices for database: ${databaseName}, customer: ${customerName || customerId || 'all'}`);
    const { Invoice } = registerModels(databaseName);
    if (!Invoice) {
      throw new Error('Invoice model not registered');
    }
    let query = {};
    if (customerId) {
      query.customerId = customerId;
    } else if (customerName) {
      query.customer = new RegExp(customerName.trim(), 'i');
    }
    const invoices = await Invoice.find(query)
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v')
      .sort({ createdAt: -1, _id: -1 }); // Sort by createdAt descending
    console.log(`Invoices fetched:`, { count: invoices.length, databaseName, customer: customerName || customerId || 'all' });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching customer invoices:', { 
      error: error.message, 
      databaseName: req.databaseName, 
      customerName,
      customerId,
      stack: error.stack 
    });
    res.status(500).json({ error: 'Failed to fetch customer invoices: ' + error.message });
  }
});
router.get('/:id/pdf', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Generating PDF for invoice:', req.params.id, 'database:', databaseName);
    const { Invoice, CompanySettings, Customer } = registerModels(databaseName);
    
    // First check if invoice exists
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    console.log('Invoice found:', { id: invoice._id, customerId: invoice.customerId, customer: invoice.customer });

    // Populate the invoice with related data
    const populatedInvoice = await Invoice.findById(req.params.id)
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN');

    if (!populatedInvoice) {
      return res.status(404).json({ error: 'Invoice not found after population' });
    }

    // Check if customer data is populated
    if (!populatedInvoice.customerId) {
      console.error('Customer not populated, trying to find customer manually');
      // Try to find customer manually if populate failed
      const customer = await Customer.findById(invoice.customerId);
      if (customer) {
        populatedInvoice.customerId = customer;
      } else {
        return res.status(404).json({ error: 'Customer not found for this invoice' });
      }
    }

    const companySettings = await CompanySettings.findOne();
    if (!companySettings) {
      return res.status(404).json({ error: 'Company settings not found' });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${populatedInvoice._id}.pdf`);
    doc.pipe(res);

    // Add company logo (with error handling)
    if (companySettings.companyLogo && fs.existsSync(companySettings.companyLogo)) {
      try {
        doc.image(companySettings.companyLogo, 50, 50, { width: 100 });
      } catch (logoError) {
        console.warn('Failed to add company logo:', logoError.message);
      }
    }

    // Add company details
    doc.fontSize(20).text(companySettings.companyName || 'Company Name', 200, 50);
    doc.fontSize(10).text(companySettings.address || '', 200, 70);
    doc.text(`${companySettings.city || ''}, ${companySettings.state || ''}, ${companySettings.country || ''} ${companySettings.pincode || ''}`, 200, 80);
    if (companySettings.GSTIN) {
      doc.text(`GSTIN: ${companySettings.GSTIN}`, 200, 90);
    }
    if (companySettings.contactNumber) {
      doc.text(`Contact: ${companySettings.contactNumber}`, 200, 100);
    }
    doc.moveDown(2);

    // Add invoice title
    doc.fontSize(16).text(`Invoice: ${populatedInvoice.type ? populatedInvoice.type.toUpperCase() : 'INVOICE'}`, { align: 'center' });
    doc.fontSize(10).text(`Date: ${new Date(populatedInvoice.date).toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();

    // Add customer details with fallback
    doc.fontSize(12).text('Billed To:');
    const customerData = populatedInvoice.customerId;
    if (customerData && customerData.name) {
      doc.fontSize(10).text(customerData.name);
      doc.text(customerData.address || '');
      doc.text(`${customerData.city || ''}, ${customerData.state || ''}, ${customerData.country || ''} ${customerData.pincode || ''}`);
      if (customerData.GSTIN) {
        doc.text(`GSTIN: ${customerData.GSTIN}`);
      }
    } else {
      // Fallback to customer name from invoice if populated data is not available
      doc.fontSize(10).text(populatedInvoice.customer || 'Customer Name Not Available');
    }
    doc.moveDown();

    // Add products table
    doc.fontSize(12).text('Items:');
    doc.moveDown(0.5);
    const tableTop = doc.y;
    const itemWidth = 200;
    const qtyWidth = 50;
    const priceWidth = 100;
    const totalWidth = 100;

    // Table headers
    doc.fontSize(10).text('Item', 50, tableTop, { width: itemWidth });
    doc.text('Qty', 250, tableTop, { width: qtyWidth, align: 'right' });
    doc.text('Price', 300, tableTop, { width: priceWidth, align: 'right' });
    doc.text('Total', 400, tableTop, { width: totalWidth, align: 'right' });
    doc.moveDown(0.5);

    // Table rows
    let currentY = doc.y;
    if (populatedInvoice.products && populatedInvoice.products.length > 0) {
      populatedInvoice.products.forEach((product, index) => {
        const qty = populatedInvoice.quantities[index] || 0;
        const price = product.price || 0;
        const total = price * qty;
        
        doc.text(product.name || 'Product Name', 50, currentY, { width: itemWidth });
        doc.text(qty.toString(), 250, currentY, { width: qtyWidth, align: 'right' });
        doc.text(`₹${price.toFixed(2)}`, 300, currentY, { width: priceWidth, align: 'right' });
        doc.text(`₹${total.toFixed(2)}`, 400, currentY, { width: totalWidth, align: 'right' });
        currentY += 20;
      });
    } else {
      doc.text('No products found', 50, currentY);
      currentY += 20;
    }

    // Totals
    doc.moveDown();
    doc.text(`Total: ₹${(populatedInvoice.total || 0).toFixed(2)}`, 400, currentY, { width: totalWidth, align: 'right' });
    if (populatedInvoice.totalReceived !== null && populatedInvoice.totalReceived !== undefined) {
      doc.text(`Received: ₹${(populatedInvoice.totalReceived || 0).toFixed(2)}`, 400, currentY + 20, { width: totalWidth, align: 'right' });
      doc.text(`Pending: ₹${(populatedInvoice.totalPendingAmount || 0).toFixed(2)}`, 400, currentY + 40, { width: totalWidth, align: 'right' });
    }

    // Add terms and conditions
    if (companySettings.termsAndConditions) {
      doc.moveDown(2);
      doc.fontSize(12).text('Terms and Conditions:');
      doc.fontSize(10).text(companySettings.termsAndConditions, { align: 'justify' });
    }

    // Add company signature (with error handling)
    if (companySettings.companySign && fs.existsSync(companySettings.companySign)) {
      try {
        doc.moveDown(2);
        doc.fontSize(12).text('Authorized Signature:');
        doc.image(companySettings.companySign, 50, doc.y, { width: 100 });
      } catch (signError) {
        console.warn('Failed to add company signature:', signError.message);
      }
    }

    doc.end();
    console.log('PDF generated successfully for invoice:', { id: populatedInvoice._id, databaseName });
  } catch (error) {
    console.error('Error generating invoice PDF:', { 
      error: error.message, 
      stack: error.stack,
      databaseName: req.databaseName,
      invoiceId: req.params.id
    });
    res.status(500).json({ error: 'Failed to generate invoice PDF: ' + error.message });
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
    const { Product, Invoice, Account, Customer } = registerModels(databaseName);

    const { customerId, customer, type, products: productIds, quantities, total, totalReceived } = req.body;

    // Validate payload
    if (!customerId || !customer || typeof customer !== 'string' || !customer.trim()) {
      throw new Error('Invalid request: Customer ID and name are required');
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

    // Validate customer
    const customerDoc = await Customer.findById(customerId);
    if (!customerDoc) {
      throw new Error('Invalid request: Customer not found');
    }
    if (customerDoc.name !== customer.trim()) {
      throw new Error('Invalid request: Customer name does not match customer ID');
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

    const parsedTotalReceived = totalReceived !== undefined && totalReceived !== null && totalReceived !== '' ? parseFloat(totalReceived) : null;
    if (parsedTotalReceived !== null && parsedTotalReceived < 0) {
      throw new Error('Invalid request: Total received cannot be negative');
    }
    if (parsedTotalReceived !== null && parsedTotalReceived > parsedTotal) {
      throw new Error('Invalid request: Total received cannot exceed total amount');
    }

    const totalPendingAmount = parsedTotalReceived !== null ? parsedTotal - parsedTotalReceived : null;

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
      customerId,
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
      customerId,
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
      if (parsedTotalReceived === null) {
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
            amount: parsedTotal,
            invoiceId: invoice._id,
            description: `Sales Invoice for ${customer}`,
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

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v');
    res.json(populatedInvoice);
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
    if (parsedTotalReceived !== null && (isNaN(parsedTotalReceived) || parsedTotalReceived < 0)) {
      throw new Error('Invalid request: Total received must be a non-negative number');
    }
    if (parsedTotalReceived !== null && parsedTotalReceived > invoice.total) {
      throw new Error('Invalid request: Total received cannot exceed total amount');
    }

    const additionalReceived = parsedTotalReceived !== null ? parsedTotalReceived - (invoice.totalReceived || 0) : 0;
    const totalPendingAmount = parsedTotalReceived !== null ? invoice.total - parsedTotalReceived : null;

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

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v');
    res.json(populatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', { error: error.message, databaseName: req.databaseName, body: req.body });
    res.status(500).json({ error: 'Failed to update invoice: ' + error.message });
  }
});

module.exports = router;