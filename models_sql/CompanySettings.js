const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanySettings = sequelize.define('CompanySettings', {
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
    companyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT, // Using TEXT for longer addresses
        allowNull: false
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false
    },
    pincode: {
        type: DataTypes.STRING,
        allowNull: false
    },
    GSTIN: {
        type: DataTypes.STRING
    },
    companyLogo: {
        type: DataTypes.STRING
    },
    companySign: {
        type: DataTypes.STRING
    },
    termsAndConditions: {
        type: DataTypes.TEXT
    },
    // Bank Details flattened or JSON? JSON is easier for migration but specific columns are better for SQL.
    // Flattening for cleaner schema:
    bankName: { type: DataTypes.STRING },
    bankAccountNumber: { type: DataTypes.STRING },
    bankIFSC: { type: DataTypes.STRING },
    bankBranch: { type: DataTypes.STRING },

    contactNumber: {
        type: DataTypes.STRING
    },
    upiId: {
        type: DataTypes.STRING
    },
    upiName: {
        type: DataTypes.STRING
    },
    printFormat: {
        type: DataTypes.ENUM('POS', 'A4', 'A5'),
        defaultValue: 'POS'
    },
    // Invoice Format Strategy - storing as JSON because it's a configuration object
    invoiceFormat: {
        type: DataTypes.JSON,
        defaultValue: {
            strategy: 'sequential',
            prefix: '',
            showFinancialYear: false,
            currentSequence: 1,
            randomLength: 6
        }
    }
}, {
    tableName: 'company_settings',
    timestamps: true
});

module.exports = CompanySettings;
