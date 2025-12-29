const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Return = sequelize.define('Return', {
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
    originalInvoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'invoices',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'customers',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    totalRefundAmount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('cash_refund', 'credit_note'),
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'returns',
    timestamps: true
});

const ReturnItem = sequelize.define('ReturnItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    returnId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'returns',
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
    reason: {
        type: DataTypes.STRING,
        defaultValue: 'Defective/Exchange'
    },
    size: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'return_items',
    timestamps: true
});

module.exports = { Return, ReturnItem };
