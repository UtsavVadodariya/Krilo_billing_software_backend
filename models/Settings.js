const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    registrationEnabled: {
        type: Boolean,
        default: true
    },
    userLimit: {
        type: Number,
        default: 100 // Default limit, can be changed by admin
    },
    adminCredentials: {
        phoneNumber: { type: String, default: '9876543210' },
        password: { type: String, default: 'admin' }
    }
}, { timestamps: true });

// Ensure only one settings document exists (Singleton pattern logic can be handled in controller)
module.exports = mongoose.model('Settings', settingsSchema);
