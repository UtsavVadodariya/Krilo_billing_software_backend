const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');

// Public: Get Settings (for Login page to know if it should show Register link)
router.get('/public', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            // Create default if not exists
            settings = await Settings.create({});
        }

        const userCount = await User.countDocuments({}); // Count all registered users as Admin is not in DB

        res.json({
            registrationEnabled: settings.registrationEnabled,
            userLimit: settings.userLimit,
            userCount: userCount,
            allowRegistration: settings.registrationEnabled && userCount < settings.userLimit
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Update Settings
router.put('/', adminAuth, async (req, res) => {
    // Check if user is admin (Assuming middleware adds req.user or we check specific admin flag)
    // For now assuming the auth middleware verifies a valid token, and we might add an isAdmin check if needed.
    // Based on previous context, there is a hardcoded admin check or specific admin routes. 
    // If this route is protected by the same 'auth' as users, we might need to ensure only admin calls it.
    // However, the task implies this is for the Admin Panel.

    try {
        const { registrationEnabled, userLimit } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({});
        }

        if (typeof registrationEnabled !== 'undefined') settings.registrationEnabled = registrationEnabled;
        if (userLimit) settings.userLimit = userLimit;

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
