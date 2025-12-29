const { sequelize } = require('../config/database');
const ApplicationLogin = require('./ApplicationLogin');
const CompanySettings = require('./CompanySettings');
const Customer = require('./Customer');
const { Product, ProductVariant } = require('./Product'); // Destructure Variant
const { Invoice, InvoiceItem } = require('./Invoice'); // Destructure InvoiceItem
const Account = require('./Account');
const { Return, ReturnItem } = require('./Return'); // Destructure ReturnItem
const Settings = require('./Settings');

// Define relationships

// User <-> CompanySettings
// User <-> CompanySettings
ApplicationLogin.hasOne(CompanySettings, { foreignKey: 'a_application_login_id', as: 'companySettings', onDelete: 'CASCADE' });
CompanySettings.belongsTo(ApplicationLogin, { foreignKey: 'a_application_login_id', as: 'companySettings' });

// User <-> Customer
ApplicationLogin.hasMany(Customer, { foreignKey: 'a_application_login_id', onDelete: 'CASCADE' });
Customer.belongsTo(ApplicationLogin, { foreignKey: 'a_application_login_id' });

// User <-> Product
ApplicationLogin.hasMany(Product, { foreignKey: 'a_application_login_id', onDelete: 'CASCADE' });
Product.belongsTo(ApplicationLogin, { foreignKey: 'a_application_login_id' });

// User <-> Invoice
ApplicationLogin.hasMany(Invoice, { foreignKey: 'a_application_login_id', onDelete: 'CASCADE' });
Invoice.belongsTo(ApplicationLogin, { foreignKey: 'a_application_login_id' });

// User <-> Account
ApplicationLogin.hasMany(Account, { foreignKey: 'a_application_login_id', onDelete: 'CASCADE' });
Account.belongsTo(ApplicationLogin, { foreignKey: 'a_application_login_id' });

// User <-> Return
ApplicationLogin.hasMany(Return, { foreignKey: 'a_application_login_id', onDelete: 'CASCADE' });
Return.belongsTo(ApplicationLogin, { foreignKey: 'a_application_login_id' });

// Product <-> ProductVariant
Product.hasMany(ProductVariant, {
    foreignKey: 'productId',
    as: 'variants',
    onDelete: 'CASCADE'
});
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

// Invoice <-> InvoiceItem
Invoice.hasMany(InvoiceItem, {
    foreignKey: 'invoiceId',
    as: 'items',
    onDelete: 'CASCADE'
});
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

// InvoiceItem <-> Product (Optional link for reference)
InvoiceItem.belongsTo(Product, { foreignKey: 'productId' });

// Invoice <-> Customer
Invoice.belongsTo(Customer, { foreignKey: 'customerId', onDelete: 'SET NULL' });
Customer.hasMany(Invoice, { foreignKey: 'customerId' });

// Account <-> Invoice (for linking payments/credits)
Account.belongsTo(Invoice, { foreignKey: 'invoiceId', onDelete: 'SET NULL' });
Invoice.hasMany(Account, { foreignKey: 'invoiceId' });

// Return <-> ReturnItem
Return.hasMany(ReturnItem, {
    foreignKey: 'returnId',
    as: 'items',
    onDelete: 'CASCADE'
});
ReturnItem.belongsTo(Return, { foreignKey: 'returnId' });

// ReturnItem <-> Product
ReturnItem.belongsTo(Product, { foreignKey: 'productId' });

// Return <-> Invoice (Original Invoice)
Return.belongsTo(Invoice, { foreignKey: 'originalInvoiceId', as: 'originalInvoice' });

// Return <-> Customer
Return.belongsTo(Customer, { foreignKey: 'customerId' });

const db = {
    sequelize,
    ApplicationLogin,
    CompanySettings,
    Customer,
    Product,
    ProductVariant,
    Invoice,
    InvoiceItem,
    Account,
    Return,
    ReturnItem,
    Settings
};

module.exports = db;
