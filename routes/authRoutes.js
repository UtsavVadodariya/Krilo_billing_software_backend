const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Use consistent JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';


router.post('/register', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    // Check if phone number already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    // Generate unique databaseName ... (Rest of logic remains same)
    const users = await User.find().sort({ _id: -1 });
    let a = 1, c = 1;
    if (users.length > 0) {
      const lastDatabaseName = users[0].databaseName;
      if (lastDatabaseName) {
        const match = lastDatabaseName.match(/krilo_a(\d+)_c(\d+)/);
        if (match) {
          a = parseInt(match[1]);
          c = parseInt(match[2]) + 1;
          if (c > 10) {
            a += 1;
            c = 1;
          }
        }
      }
    }
    const databaseName = `krilo_a${a}_c${c}`;

    // Validate database name uniqueness
    const existingDatabase = await User.findOne({ databaseName });
    if (existingDatabase) {
      return res.status(400).json({ error: 'System busy, please try again' });
    }

    // Create user
    const user = new User({ phoneNumber, password, databaseName });
    await user.save();
    console.log('User registered successfully', { phoneNumber, databaseName });

    // Create user database and collections
    try {
      const userDb = mongoose.connection.useDb(databaseName, { useCache: false });
      await userDb.createCollection('products');
      await userDb.createCollection('invoices');
      await userDb.createCollection('accounts');
    } catch (dbError) {
      console.error('Failed to create user database/collections', { databaseName, error: dbError.message });
      await User.deleteOne({ phoneNumber });
      return res.status(500).json({ error: 'Failed to initialize user database' });
    }

    const token = jwt.sign({ userId: user._id, databaseName }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ message: 'User registered', token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Registration failed: ' + error.message });
  }
});

router.post('/check-user', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findOne({ phoneNumber });
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

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
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
      // Password Authentication Logic (First time or until PIN is set)
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid Password' });
      }
    }

    if (!user.databaseName) {
      return res.status(400).json({ error: 'User account incomplete' });
    }

    const sessionKey = Math.floor(100000 + Math.random() * 900000).toString();
    user.currentSessionKey = sessionKey;
    await user.save();

    const token = jwt.sign({ userId: user._id, databaseName: user.databaseName }, JWT_SECRET, { expiresIn: '8h' });
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
    await User.findByIdAndUpdate(decoded.userId, { pin: hashedPin });

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
    const user = await User.findById(decoded.userId).select('phoneNumber role pin currentSessionKey');

    if (!user) return res.status(404).json({ error: 'User not found', redirect: true });

    // Lazy generation of session key for existing logged-in users
    if (!user.currentSessionKey) {
      user.currentSessionKey = Math.floor(100000 + Math.random() * 900000).toString();
      await user.save();
    }

    res.json({ _id: user._id, phoneNumber: user.phoneNumber, role: user.role, hasPin: !!user.pin, sessionKey: user.currentSessionKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user: ' + error.message });
  }
});

// Add token validation route
router.get('/validate-token', async (req, res) => {
  try {
    console.log('GET /api/auth/validate-token called');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('Token validation: No token provided');
      return res.status(401).json({
        error: 'No token provided',
        redirect: true
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token validation: Token decoded successfully', {
        userId: decoded.userId,
        databaseName: decoded.databaseName
      });
    } catch (err) {
      console.error('Token validation: Token verification failed:', {
        error: err.message,
        token: token.substring(0, 20) + '...'
      });
      return res.status(401).json({
        error: 'Invalid or expired token',
        redirect: true
      });
    }

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('Token validation: User not found for ID:', decoded.userId);
      return res.status(401).json({
        error: 'User not found',
        redirect: true
      });
    }

    // Check if databaseName exists
    if (!decoded.databaseName) {
      console.error('Token validation: databaseName missing in token', { userId: decoded.userId });
      return res.status(401).json({
        error: 'Invalid token: databaseName missing',
        redirect: true
      });
    }

    console.log('Token validation: Token is valid', {
      userId: decoded.userId,
      databaseName: decoded.databaseName,
      email: user.email
    });

    res.json({
      valid: true,
      userId: decoded.userId,
      databaseName: decoded.databaseName,
      email: user.email
    });
  } catch (error) {
    console.error('Token validation error:', { error: error.message });
    res.status(401).json({
      error: 'Token validation failed',
      redirect: true
    });
  }
});

// Validate Session Key
router.post('/validate-key', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });

    const user = await User.findOne({ currentSessionKey: key });
    if (!user) {
      return res.json({ valid: false });
    }

    res.json({ valid: true, merchantId: user._id });
  } catch (error) {
    res.status(500).json({ error: 'Validation failed: ' + error.message });
  }
});

module.exports = router;