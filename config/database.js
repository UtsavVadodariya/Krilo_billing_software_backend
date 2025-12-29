const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false, // Set to console.log to see SQL queries
        dialectOptions: process.env.DB_SSL === 'true' ? {
            ssl: {
                require: true,
                rejectUnauthorized: false // Often needed for Aiven/cloud DBs
            }
        } : {}
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`MySQL Connected to ${process.env.DB_HOST} (${process.env.DB_NAME})`);

        // Sync models (creates tables if they don't exist)
        // In production, you might want to use migrations instead of sync()
        // await sequelize.sync({ alter: true }); 
        // console.log('MySQL Models Synced');
    } catch (error) {
        console.error('MySQL Connection Error:', error);
        // process.exit(1); // Don't crash immediately during migration testing
    }
};

module.exports = { sequelize, connectDB };
