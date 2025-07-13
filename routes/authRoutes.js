const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.error('Registration failed: Missing email or password', { email, password: !!password });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    console.log('existingUser', existingUser);
    if (existingUser) {
      console.error('Registration failed: Email already exists', { email });
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate unique database name
    const users = await User.find().sort({ _id: -1 });
    console.log('users', users);
    let a = 1, c = 1;
    if (users.length > 0) {
      const lastDatabaseName = users[0].databaseName;
      if (lastDatabaseName) {
        const match = lastDatabaseName.match(/krilo_a(\d+)_c(\d+)/);
        console.log('match', match);
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

    // Check if database name is unique
    const existingDatabase = await User.findOne({ databaseName });
    if (existingDatabase) {
      console.error('Registration failed: Database name already exists', { databaseName });
      return res.status(400).json({ error: 'Database name conflict, please try again' });
    }

    // Create user
    const user = new User({ email, password, databaseName });
    await user.save();
    console.log('User registered successfully', { email, databaseName });

    // Create user database and collections
    try {
      const userDb = mongoose.connection.useDb(databaseName, { useCache: false });
      await userDb.createCollection('products');
      await userDb.createCollection('invoices');
      await userDb.createCollection('accounts');
      console.log('User database and collections created', { databaseName });
    } catch (dbError) {
      console.error('Failed to create user database/collections', { databaseName, error: dbError.message });
      // Clean up user if database creation fails
      await User.deleteOne({ email });
      return res.status(500).json({ error: 'Failed to initialize user database' });
    }

    // Auto-login after registration
    const token = jwt.sign({ userId: user._id, databaseName }, 'secret_key', { expiresIn: '1h' });
    res.status(201).json({ message: 'User registered', token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Registration failed: ' + error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.error('Login failed: Missing email or password', { email, password: !!password });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      console.error('Login failed: Invalid credentials', { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if databaseName exists
    if (!user.databaseName) {
      console.error('Login failed: User database name missing', { email });
      return res.status(400).json({ error: 'User account incomplete, please re-register' });
    }

    const token = jwt.sign({ userId: user._id, databaseName: user.databaseName }, 'secret_key', { expiresIn: '1h' });
    console.log('User logged in successfully', { email, databaseName: user.databaseName });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

router.get('/user', async (req, res) => {
  try {
    console.log('GET /api/auth/user called');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('GET /api/auth/user: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('GET /api/auth/user: Decoded token:', { userId: decoded.userId, databaseName: decoded.databaseName });
    } catch (err) {
      console.error('GET /api/auth/user: Token verification failed:', { error: err.message, token: token.substring(0, 20) + '...' });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId).select('email role');
    if (!user) {
      console.log('GET /api/auth/user: User not found for ID:', decoded.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('GET /api/auth/user: User fetched:', { email: user.email, role: user.role });
    res.json({ email: user.email, role: user.role });
  } catch (error) {
    console.error('GET /api/auth/user: Error fetching user:', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch user: ' + error.message });
  }
});

module.exports = router;