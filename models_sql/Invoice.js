const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    a_application_login_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'a_application_logins',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    customerId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'customers',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    customerName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('sales_invoice', 'purchase_invoice', 'quotation', 'sales_order'),
        allowNull: false
    },
    paymentMode: {
        type: DataTypes.ENUM('Cash', 'Credit', 'UPI', 'Card', 'Mixed'),
        defaultValue: 'Cash'
    },
    invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    seriesNumber: {
        type: DataTypes.INTEGER
    },
    financialYear: {
        type: DataTypes.STRING
    },
    total: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    grandTotalDiscount: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    totalReceived: {
        type: DataTypes.FLOAT
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'invoices',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['a_application_login_id', 'invoiceNumber'] // Ensure unique invoice number per user
        }
    ]
});

const InvoiceItem = sequelize.define('InvoiceItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'invoices',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    productId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'products',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    discount: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    discountType: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        defaultValue: 'percentage'
    },
    gstAmount: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    size: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'invoice_items',
    timestamps: true
});

module.exports = { Invoice, InvoiceItem };
