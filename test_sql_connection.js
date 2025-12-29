const { connectDB, sequelize } = require('./config/database');

async function test() {
    console.log('Testing MySQL Connection...');
    await connectDB();

    try {
        await sequelize.close();
        console.log('Connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error closing connection:', error);
        process.exit(1);
    }
}

test();
