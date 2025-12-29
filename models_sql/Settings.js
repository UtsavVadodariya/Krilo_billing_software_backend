const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Settings = sequelize.define('Settings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    registrationEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    userLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 100
    },
    // We can store admin creds here or env, but following existing pattern
    adminPhoneNumber: {
        type: DataTypes.STRING,
        defaultValue: '9876543210'
    },
    adminPassword: {
        type: DataTypes.STRING,
        defaultValue: 'admin'
    }
}, {
    tableName: 'a_global_settings', // Distinct from user tables
    timestamps: true
});

module.exports = Settings;
