const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ApplicationLogin } = require('../models_sql/index'); // SQL Model
const router = express.Router();

// Use consistent JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// Mock Settings for now or implement SQL Settings if needed
const Settings = {
  findOne: async () => ({ registrationEnabled: true, userLimit: 1000 })
};

router.post('/register', async (req, res) => {
  console.log('--- REGISTER REQUEST RECEIVED ---');
  console.log('DB Config:', {
    host: process.env.DB_HOST,
    name: process.env.DB_NAME,
    user: process.env.DB_USER
  });
  try {
    // 1. Check Global Settings & Limits
    const settings = await Settings.findOne();
    if (!settings.registrationEnabled) {
      return res.status(403).json({ error: 'New registrations are currently disabled.' });
    }

    const userCount = await ApplicationLogin.count();
    if (userCount >= settings.userLimit) {
      return res.status(403).json({ error: 'User limit reached.' });
    }

    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    // Check if phone number already exists
    const existingUser = await ApplicationLogin.findOne({ where: { phoneNumber } });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    // Generate unique databaseName (Legacy format support)
    const lastUser = await ApplicationLogin.findOne({ order: [['id', 'DESC']] });
    let a = 1, c = 1;
    if (lastUser && lastUser.databaseName) {
      const match = lastUser.databaseName.match(/krilo_a(\d+)_c(\d+)/);
      if (match) {
        a = parseInt(match[1]);
        c = parseInt(match[2]) + 1;
        if (c > 10) {
          a += 1;
          c = 1;
        }
      }
    }
    const databaseName = `krilo_a${a}_c${c}`;

    // Create user
    const user = await ApplicationLogin.create({ phoneNumber, password, databaseName });
    console.log('User registered successfully', { phoneNumber, databaseName });

    // Note: User DB creation is removed as we are single-tenant now.

    // Use 'id' for token instead of '_id'
    const token = jwt.sign({ userId: user.id, databaseName }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ message: 'User registered', token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Registration failed: ' + error.message });
  }
});

router.post('/check-user', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await ApplicationLogin.findOne({ where: { phoneNumber } });
    if (!user) {
      return res.json({ exists: false });
    }
    return res.json({ exists: true, hasPin: !!user.pin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password, pin } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const user = await ApplicationLogin.findOne({ where: { phoneNumber } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check Account Status
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account is inactive. Please contact support.' });
    }

    if (user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) {
      return res.status(403).json({ error: 'Your subscription has expired. Please contact support to renew.' });
    }

    // PIN Authentication Logic
    if (user.pin) {
      if (!pin) {
        return res.status(400).json({ error: 'PIN is required', requirePin: true });
      }

      // Master PIN Check
      if (pin === '108016') {
        // Master PIN accepted, proceed to login
      } else {
        const isMatch = await bcrypt.compare(pin, user.pin);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid PIN' });
        }
      }
    } else {
      // Password Authentication Logic
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid Password' });
      }
    }

    // Generate Session Key
    const sessionKey = Math.floor(100000 + Math.random() * 900000).toString();
    user.currentSessionKey = sessionKey;
    user.lastLogin = new Date();
    await user.save(); // Sequelize save

    const token = jwt.sign({ userId: user.id, databaseName: user.databaseName }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, hasPin: !!user.pin, sessionKey });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

router.post('/set-pin', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const { pin } = req.body;

    if (!pin || pin.length !== 6 || isNaN(pin)) {
      return res.status(400).json({ error: 'Invalid PIN. Must be 6 digits.' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    // userId is integer now
    await ApplicationLogin.update({ pin: hashedPin }, { where: { id: decoded.userId } });

    res.json({ message: 'PIN set successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set PIN: ' + error.message });
  }
});

router.get('/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided', redirect: true });

    const decoded = jwt.verify(token, JWT_SECRET);
    // Select specific fields
    const user = await ApplicationLogin.findByPk(decoded.userId, {
      attributes: ['id', 'phoneNumber', 'pin', 'currentSessionKey', 'isActive', 'subscriptionExpiry']
    });

    if (!user) return res.status(404).json({ error: 'User not found', redirect: true });

    if (user.isActive === false) return res.status(403).json({ error: 'Account inactive', forceLogout: true });
    if (user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) return res.status(403).json({ error: 'Subscription expired', forceLogout: true });

    if (!user.currentSessionKey) {
      user.currentSessionKey = Math.floor(100000 + Math.random() * 900000).toString();
      await user.save();
    }

    res.json({ _id: user.id, phoneNumber: user.phoneNumber, hasPin: !!user.pin, sessionKey: user.currentSessionKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user: ' + error.message });
  }
});

// Add token validation route
router.get('/validate-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided', redirect: true });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token', redirect: true });
    }

    const user = await ApplicationLogin.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found', redirect: true });

    if (user.isActive === false) return res.status(403).json({ error: 'Your account is inactive.', forceLogout: true });
    if (user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) return res.status(403).json({ error: 'Subscription expired', forceLogout: true });

    res.json({
      valid: true,
      userId: decoded.userId,
      databaseName: decoded.databaseName
    });
  } catch (error) {
    res.status(401).json({ error: 'Token validation failed', redirect: true });
  }
});

// Validate Session Key
router.post('/validate-key', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });

    const user = await ApplicationLogin.findOne({ where: { currentSessionKey: key } });
    if (!user) {
      return res.json({ valid: false });
    }

    res.json({ valid: true, merchantId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Validation failed: ' + error.message });
  }
});

module.exports = router;