const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mobileNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT
    },
    country: {
        type: DataTypes.STRING
    },
    state: {
        type: DataTypes.STRING
    },
    city: {
        type: DataTypes.STRING
    },
    pincode: {
        type: DataTypes.STRING
    },
    GSTIN: {
        type: DataTypes.STRING
    },
    creditBalance: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    }
}, {
    tableName: 'customers',
    timestamps: true
});

module.exports = Customer;
