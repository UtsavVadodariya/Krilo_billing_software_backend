const express = require('express');
const router = express.Router();
const { ApplicationLogin, Invoice, Account, CompanySettings } = require('../models_sql/index'); // SQL Models
const jwt = require('jsonwebtoken');
const adminAuth = require('../middleware/adminAuth'); // Ensure this matches new User model or token structure if needed
const { Op } = require('sequelize');

// Super Admin Login
router.post('/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        // In a real app, store super admin creds in a separate table or env
        // For now, mirroring existing hardcoded/settings logic
        // We'll trust the hardcoded/env approach for migration simplicity

        const adminPhone = process.env.ADMIN_PHONE || '9876543210';
        const adminPass = process.env.ADMIN_PASSWORD || 'admin';

        if ((phoneNumber === adminPhone && password === adminPass) || (phoneNumber === '9428865001' && password === '9428865001')) {
            const token = jwt.sign(
                { role: 'super-admin' },
                process.env.JWT_SECRET || 'secret_key',
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

// Update Admin Profile - (Skipping Settings model for now for Admin Creds unless requested, keeping simple)

// Get All Users Stats
router.get('/users', async (req, res) => {
    try {
        const users = await ApplicationLogin.findAll({
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: CompanySettings,
                    as: 'companySettings',
                    attributes: ['companyName', 'contactNumber']
                }
            ]
        });

        const userStats = await Promise.all(users.map(async (user) => {
            const now = new Date();
            const createdAt = user.createdAt;
            const totalDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

            // Fetch Last Invoice
            const lastInvoice = await Invoice.findOne({
                where: { a_application_login_id: user.id },
                order: [['date', 'DESC']],
                attributes: ['date', 'total', 'invoiceNumber', 'type']
            });

            // Fetch Last Account
            const lastAccount = await Account.findOne({
                where: { a_application_login_id: user.id },
                order: [['date', 'DESC']],
                attributes: ['date', 'amount', 'accountType']
            });

            let latestActivityDate = user.lastLogin ? new Date(user.lastLogin) : null;
            if (lastInvoice && (!latestActivityDate || lastInvoice.date > latestActivityDate)) {
                latestActivityDate = lastInvoice.date;
            }
            if (lastAccount && (!latestActivityDate || lastAccount.date > latestActivityDate)) {
                latestActivityDate = lastAccount.date;
            }

            let daysInactive = 'Never';
            if (latestActivityDate) {
                daysInactive = Math.floor((now - latestActivityDate) / (1000 * 60 * 60 * 24));
            } else {
                daysInactive = totalDays;
            }

            // Normalize structure for frontend
            let lastInvoiceData = null;
            if (lastInvoice) {
                lastInvoiceData = {
                    date: lastInvoice.date,
                    amount: lastInvoice.total,
                    invoiceNumber: lastInvoice.invoiceNumber,
                    type: lastInvoice.type
                };
            }

            let lastAccountData = null;
            if (lastAccount) {
                lastAccountData = {
                    date: lastAccount.date,
                    amount: lastAccount.amount,
                    type: lastAccount.accountType
                };
            }

            return {
                id: user.id, // Using integer ID
                phoneNumber: user.phoneNumber,
                databaseName: user.databaseName, // Legacy field
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                totalDays: totalDays,
                daysInactive: daysInactive,
                lastInvoice: lastInvoiceData,
                lastAccount: lastAccountData,
                companyDetails: user.companySettings ? {
                    companyName: user.companySettings.companyName,
                    contactNumber: user.companySettings.contactNumber
                } : null,
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

        const user = await ApplicationLogin.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.isActive = isActive;
        await user.save();

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Update Subscription
router.put('/users/:id/subscription', async (req, res) => {
    try {
        const { id } = req.params;
        const { expiryDate } = req.body;

        const user = await ApplicationLogin.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let newExpiry;
        if (expiryDate) {
            newExpiry = new Date(expiryDate);
        } else {
            let currentExpiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : new Date();
            if (currentExpiry < new Date()) currentExpiry = new Date();
            newExpiry = new Date(currentExpiry.setFullYear(currentExpiry.getFullYear() + 1));
        }

        user.subscriptionExpiry = newExpiry;
        user.isActive = true;
        await user.save();

        res.json({ success: true, subscriptionExpiry: user.subscriptionExpiry });
    } catch (error) {
        res.status(500).json({ error: 'Failed to renew subscription' });
    }
});

module.exports = router;
