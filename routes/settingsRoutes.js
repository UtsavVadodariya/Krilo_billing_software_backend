const express = require('express');
const router = express.Router();
const { Settings, ApplicationLogin } = require('../models_sql/index'); // SQL Models
const adminAuth = require('../middleware/adminAuth');

// Public: Get Settings
router.get('/public', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        const userCount = await ApplicationLogin.count();

        res.json({
            registrationEnabled: settings.registrationEnabled,
            userLimit: settings.userLimit,
            userCount: userCount,
            allowRegistration: settings.registrationEnabled && userCount < settings.userLimit
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Admin: Update Settings
router.put('/', adminAuth, async (req, res) => {
    try {
        const { registrationEnabled, userLimit } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
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
