const mongoose = require('mongoose');
const productSchema = require('./Product');
const invoiceSchema = require('./Invoice');
const accountSchema = require('./Account');

const registerModels = (dbName) => {
  if (!dbName) {
    throw new Error('Database name is required for model registration');
  }
  console.log('Registering models for database:', dbName);
  const conn = mongoose.connection.useDb(dbName, { useCache: false });

  // Clear existing models to avoid conflicts
  if (conn.models['Product']) {
    delete conn.models['Product'];
    console.log('Cleared existing Product model for:', dbName);
  }
  if (conn.models['Invoice']) {
    delete conn.models['Invoice'];
    console.log('Cleared existing Invoice model for:', dbName);
  }
  if (conn.models['Account']) {
    delete conn.models['Account'];
    console.log('Cleared existing Account model for:', dbName);
  }

  // Register Product model first
  const ProductModel = conn.model('Product', productSchema, 'products');
  console.log('Product model registered for:', dbName);

  // Register Invoice model
  const InvoiceModel = conn.model('Invoice', invoiceSchema, 'invoices');
  console.log('Invoice model registered for:', dbName);

  // Register Account model
  const AccountModel = conn.model('Account', accountSchema, 'accounts');
  console.log('Account model registered for:', dbName);

  return { Product: ProductModel, Invoice: InvoiceModel, Account: AccountModel };
};

module.exports = registerModels;
