const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Account = sequelize.define('Account', {
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
    invoiceId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'invoices',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    accountType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('debit', 'credit'),
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'accounts',
    timestamps: true
});

module.exports = Account;
