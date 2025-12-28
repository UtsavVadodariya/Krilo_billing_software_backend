const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');
const adminAuth = require('../middleware/adminAuth');

// Super Admin Login
router.post('/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        // Fetch Admin Credentials from Settings
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});

        const adminPhone = settings.adminCredentials?.phoneNumber || '9876543210';
        const adminPass = settings.adminCredentials?.password || 'admin';

        if (phoneNumber === adminPhone && password === adminPass) {
            const token = jwt.sign(
                { role: 'super-admin' },
                process.env.JWT_SECRET || 'secret_key', // Use consistent secret
                { expiresIn: '4h' }
            );
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid admin credentials' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Admin Profile (Protected)
router.put('/profile', adminAuth, async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        if (!phoneNumber || !password) {
            return res.status(400).json({ error: 'Phone and Password are required' });
        }

        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});

        settings.adminCredentials = { phoneNumber, password };
        await settings.save();

        res.json({ message: 'Admin credentials updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

const mongoose = require('mongoose');
const invoiceSchema = require('../models/Invoice');
const accountSchema = require('../models/Account');
const companySettingsSchema = require('../models/CompanySettings');

// Get All Users Stats
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });

        const userStats = await Promise.all(users.map(async (user) => {
            const now = new Date();

            // 1. Fix Registration Date for Old Users
            let createdAt = user.createdAt;
            if (!createdAt) {
                // Fallback to extraction from ObjectId
                createdAt = user._id.getTimestamp();
            }

            // Calculate Total Days
            const totalDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

            // 2. Connector to User's Database
            let lastInvoice = null;
            let lastAccount = null;
            let companyDetails = null;
            let latestActivityDate = user.lastLogin ? new Date(user.lastLogin) : null;

            if (user.databaseName) {
                try {
                    // Establish connection to user's DB
                    const userDb = mongoose.connection.useDb(user.databaseName, { useCache: false });

                    // Define Models for this DB
                    const UserInvoice = userDb.model('Invoice', invoiceSchema);
                    const UserAccount = userDb.model('Account', accountSchema);
                    const UserCompanySettings = userDb.model('CompanySettings', companySettingsSchema);

                    // Fetch Company Settings
                    const settings = await UserCompanySettings.findOne().lean();
                    if (settings) {
                        companyDetails = {
                            companyName: settings.companyName,
                            contactNumber: settings.contactNumber
                        };
                    }

                    // Fetch Last Invoice
                    const invoice = await UserInvoice.findOne().sort({ date: -1 }).lean();
                    if (invoice) {
                        lastInvoice = {
                            date: invoice.date,
                            amount: invoice.total,
                            invoiceNumber: invoice.invoiceNumber,
                            type: invoice.type
                        };
                        // Check if this is more recent
                        if (!latestActivityDate || new Date(invoice.date) > latestActivityDate) {
                            latestActivityDate = new Date(invoice.date);
                        }
                    }

                    // Fetch Last Account Activity
                    const account = await UserAccount.findOne().sort({ date: -1 }).lean();
                    if (account) {
                        lastAccount = {
                            date: account.date,
                            amount: account.amount,
                            type: account.accountType
                        };
                        // Check if this is more recent
                        if (!latestActivityDate || new Date(account.date) > latestActivityDate) {
                            latestActivityDate = new Date(account.date);
                        }
                    }

                } catch (dbErr) {
                    console.error(`Error accessing stats for ${user.databaseName}:`, dbErr.message);
                }
            }

            // 3. Calculate Days Inactive based on LATEST activity
            let daysInactive = 'Never';

            if (latestActivityDate) {
                daysInactive = Math.floor((now - latestActivityDate) / (1000 * 60 * 60 * 24));
            } else {
                daysInactive = totalDays;
            }

            return {
                _id: user._id,
                phoneNumber: user.phoneNumber,
                databaseName: user.databaseName,
                createdAt: createdAt,
                lastLogin: user.lastLogin,
                totalDays: totalDays,
                daysInactive: daysInactive,
                lastInvoice: lastInvoice,
                lastAccount: lastAccount,
                companyDetails: companyDetails,
                isActive: user.isActive,
                subscriptionExpiry: user.subscriptionExpiry
            };
        }));

        res.json(userStats);
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
    }
});

// Toggle User Status
router.put('/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Update Subscription (Renew/Edit)
router.put('/users/:id/subscription', async (req, res) => {
    try {
        const { id } = req.params;
        const { expiryDate } = req.body; // Get custom date if provided

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let newExpiry;

        if (expiryDate) {
            // Use user-provided custom date
            newExpiry = new Date(expiryDate);
        } else {
            // Default: Renew for 1 year from NOW or current expiry if future
            let currentExpiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : new Date();
            // If expired, start from today
            if (currentExpiry < new Date()) {
                currentExpiry = new Date();
            }
            // Add 1 Year
            newExpiry = new Date(currentExpiry.setFullYear(currentExpiry.getFullYear() + 1));
        }

        user.subscriptionExpiry = newExpiry;
        user.isActive = true; // Auto-activate

        await user.save();

        res.json({ success: true, subscriptionExpiry: user.subscriptionExpiry });
    } catch (error) {
        res.status(500).json({ error: 'Failed to renew subscription' });
    }
});

module.exports = router;
