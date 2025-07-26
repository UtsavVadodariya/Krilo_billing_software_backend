const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const productRoutes = require('./routes/productRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const accountRoutes = require('./routes/accountRoutes');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const companySettingsRoutes = require('./routes/companySettingsRoutes');
const authMiddleware = require('./middleware/auth');
const { mongooseConnectIndex, baseUrl } = require('./utils/baseUrl');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://krilobilling.easywayitsolutions.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Serve static files with explicit CORS headers for /uploads
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', `${baseUrl}`);
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  console.log(`Serving file request: ${req.path}`); // Log file requests
  const filePath = path.join(__dirname, 'Uploads', req.path);
  console.log(`Attempting to serve file: ${filePath}`); // Log file path
  express.static(path.join(__dirname, 'Uploads'))(req, res, next);
});

// JSON middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/invoices', authMiddleware, invoiceRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/company-settings', authMiddleware, companySettingsRoutes);

// Connect to MongoDB
mongoose.connect(`${mongooseConnectIndex}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected to krilo_billing_software');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
