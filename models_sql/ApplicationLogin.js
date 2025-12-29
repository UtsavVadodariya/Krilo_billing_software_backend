const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const ApplicationLogin = sequelize.define('ApplicationLogin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    pin: {
        type: DataTypes.STRING
    },
    databaseName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Legacy field for reference, used as company slug'
    },
    currentSessionKey: {
        type: DataTypes.STRING
    },
    lastLogin: {
        type: DataTypes.DATE
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    subscriptionExpiry: {
        type: DataTypes.DATE,
        defaultValue: () => {
            const date = new Date();
            date.setFullYear(date.getFullYear() + 1);
            return date;
        }
    }
}, {
    tableName: 'a_application_logins',
    timestamps: true,
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

// Instance method to compare password
ApplicationLogin.prototype.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = ApplicationLogin;
