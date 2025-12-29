const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envFile) });

async function createDatabase() {
    const dbName = 'krilo_billing';

    console.log(`Connecting to ${process.env.DB_HOST} as ${process.env.DB_USER}...`);

    try {
        // Connect to the default database locally to create the new one
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'defaultdb', // Check Aiven default, usually defaultdb
            ssl: { rejectUnauthorized: false }
        });

        console.log(`Connected. Creating database '${dbName}' if not exists...`);

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`Database '${dbName}' created or already exists.`);

        await connection.end();
    } catch (error) {
        console.error('Error creating database:', error);
        process.exit(1);
    }
}

createDatabase();
