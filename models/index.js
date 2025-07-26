const mongoose = require('mongoose');
const productSchema = require('./Product');
const invoiceSchema = require('./Invoice');
const accountSchema = require('./Account');
const customerSchema = require('./Customer');
const companySettingsSchema = require('./CompanySettings');

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
  if (conn.models['Customer']) {
    delete conn.models['Customer'];
    console.log('Cleared existing Customer model for:', dbName);
  }
  if (conn.models['CompanySettings']) {
    delete conn.models['CompanySettings'];
    console.log('Cleared existing CompanySettings model for:', dbName);
  }

  // Register models
  const ProductModel = conn.model('Product', productSchema, 'products');
  console.log('Product model registered for:', dbName);
  const InvoiceModel = conn.model('Invoice', invoiceSchema, 'invoices');
  console.log('Invoice model registered for:', dbName);
  const AccountModel = conn.model('Account', accountSchema, 'accounts');
  console.log('Account model registered for:', dbName);
  const CustomerModel = conn.model('Customer', customerSchema, 'customers');
  console.log('Customer model registered for:', dbName);
  const CompanySettingsModel = conn.model('CompanySettings', companySettingsSchema, 'companySettings');
  console.log('CompanySettings model registered for:', dbName);

  return {
    Product: ProductModel,
    Invoice: InvoiceModel,
    Account: AccountModel,
    Customer: CustomerModel,
    CompanySettings: CompanySettingsModel,
  };
};

module.exports = registerModels;