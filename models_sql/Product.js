const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
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
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    purchasePrice: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    gst: {
        type: DataTypes.FLOAT, // Storing as percentage e.g., 18.0
        defaultValue: 0
    },
    description: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'products',
    timestamps: true
});

const ProductVariant = sequelize.define('ProductVariant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    size: {
        type: DataTypes.STRING,
        allowNull: false
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    price: {
        type: DataTypes.FLOAT
    },
    purchasePrice: {
        type: DataTypes.FLOAT
    }
}, {
    tableName: 'product_variants',
    timestamps: true
});

module.exports = { Product, ProductVariant };
