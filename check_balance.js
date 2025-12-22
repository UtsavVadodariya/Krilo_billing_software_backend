const mongoose = require('mongoose');
const { Customer } = require('./models'); // Assuming index exports models
const config = require('./config'); // Assuming connection string is here or hardcoded
require('dotenv').config();

async function checkBalance() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/krilo_billing');

        const customers = await Customer.find({ creditBalance: { $gt: 0 } });
        console.log('Customers with Credit Balance:', customers);

        const allCustomers = await Customer.find({});
        console.log('Total Customers:', allCustomers.length);
        if (allCustomers.length > 0) {
            console.log('First Customer Sample:', allCustomers[0]);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkBalance();
