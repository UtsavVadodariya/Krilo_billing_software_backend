const mongoose = require('mongoose');
const Settings = require('./models/Settings');

// Connection String from utils/baseUrl.js (or hardcoded if known, checking context)
// Based on index.js, it imports mongooseConnectIndex from utils/baseUrl
// I'll grab it directly or just use the local connection string if I can find it.
// Let's retry reading `utils/baseUrl.js` first to be sure, OR just try the standard local one.
// Actually, I'll read `utils/baseUrl.js` first in the previous step? No, I just read index.js.
// Let's assume standard local for now or try to require it.

async function resetAdmin() {
    try {
        // Connect to MongoDB
        // Note: I need the actual URI. 
        // Let's assume it's stored in a file I can access or pass it in.
        // I will first READ utils/baseUrl.js in the next step to get the URI, 
        // BUT to save steps I'll just write this script to require it.

        const { mongooseConnectIndex } = require('./utils/baseUrl');

        await mongoose.connect(mongooseConnectIndex);
        console.log('Connected to MongoDB');

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        settings.adminCredentials = {
            phoneNumber: '9428865001',
            password: '9428865001'
        };

        await settings.save();
        console.log('Admin credentials updated to 9428865001 / 9428865001');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

resetAdmin();
