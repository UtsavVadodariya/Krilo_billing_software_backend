const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000'; // Match your verify_fix.js port
const AUTH_PHONE = '9876543210';
const AUTH_PASS = '123456';
const AUTH_DB = 'test_db_' + Date.now();

// Mock User Data for Registration
const userData = {
    phoneNumber: '9' + Math.floor(Math.random() * 1000000000),
    password: 'password123',
    databaseName: 'verify_user_db',
    name: 'Verify User'
};

async function runVerification() {
    console.log('--- Starting Verification ---');
    let token = '';
    let userId = null;
    let productId = null;
    let customerId = null;
    let invoiceId = null;

    try {
        // 1. REGISTER
        console.log('\n1. Registering User...');
        try {
            const regRes = await axios.post(`${BASE_URL}/api/auth/register`, userData);
            console.log('   Registration Success:', regRes.data.message);
        } catch (e) {
            if (e.response && e.response.status === 400 && e.response.data.error.includes('already exists')) {
                console.log('   User already exists, proceeding to login.');
            } else {
                throw e;
            }
        }

        // 2. LOGIN
        console.log('\n2. Logging In...');
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            phoneNumber: userData.phoneNumber,
            password: userData.password
        });
        token = loginRes.data.token;
        console.log('   Login Success. Token received.');

        const headers = { Authorization: 'Bearer ' + token };

        // 3. CREATE CUSTOMER
        console.log('\n3. Creating Customer...');
        const custRes = await axios.post(`${BASE_URL}/api/customers`, {
            name: 'Test Customer',
            mobileNumber: '8888888888',
            address: 'Test Address',
            country: 'India',
            state: 'Gujarat',
            city: 'Ahmedabad',
            pincode: '380001'
        }, { headers });
        customerId = custRes.data.id;
        console.log('   Customer Created:', customerId);

        // 4. CREATE PRODUCT
        console.log('\n4. Creating Product...');
        const prodRes = await axios.post(`${BASE_URL}/api/products`, {
            name: 'Test Product',
            category: 'General',
            price: 100,
            stock: 50,
            gst: 18,
            variants: [
                { size: 'M', stock: 20, price: 100 },
                { size: 'L', stock: 30, price: 100 }
            ]
        }, { headers });
        productId = prodRes.data.id;
        console.log('   Product Created:', productId);

        // 5. CREATE INVOICE
        console.log('\n5. Creating Invoice...');
        const invRes = await axios.post(`${BASE_URL}/api/invoices`, {
            customerId: customerId,
            customer: 'Test Customer',
            type: 'sales_invoice',
            products: [productId],
            quantities: [2],
            prices: [100],
            discounts: [0],
            discountTypes: ['percentage'],
            gstAmounts: [36],
            total: 236, // 100*2 + 18%
            totalReceived: 236,
            sizes: ['M']
        }, { headers });
        invoiceId = invRes.data.id;
        console.log('   Invoice Created:', invoiceId, 'Inv#:', invRes.data.invoiceNumber);

        // 6. GENERATE PDF (Check URL)
        console.log('\n6. Checking PDF Generation...');
        try {
            await axios.get(`${BASE_URL}/api/invoices/${invoiceId}/pdf`, { headers, responseType: 'blob' });
            console.log('   PDF Generated Successfully.');
        } catch (e) {
            console.error('   PDF Generation Failed:', e.message);
        }

        // 7. CREATE RETURN
        console.log('\n7. Creating Return...');
        const retRes = await axios.post(`${BASE_URL}/api/returns`, {
            originalInvoiceId: invoiceId,
            customerId: customerId,
            products: [
                { productId: productId, quantity: 1, size: 'M', price: 100 }
            ],
            totalRefundAmount: 118,
            type: 'cash_refund'
        }, { headers });
        console.log('   Return Created:', retRes.data.id);

        console.log('\n--- Verification Complete: SUCCESS ---');
    } catch (error) {
        console.error('\n--- Verification Failed ---');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        }
    }
}

runVerification();
