const express = require('express');
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const cors = require('cors');
const path = require('path');
const User = require('./models/User');
const productRoutes = require('./routes/productRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const accountRoutes = require('./routes/accountRoutes');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const returnRoutes = require('./routes/returnRoutes'); // Import return routes
const companySettingsRoutes = require('./routes/companySettingsRoutes');
const authMiddleware = require('./middleware/auth');
const { mongooseConnectIndex, baseUrl } = require('./utils/baseUrl');

const app = express();

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow any origin for local development/testing on network
    // You can restrict this in production
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Serve static files with explicit CORS headers for /uploads
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all for uploads
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
app.use('/api/returns', authMiddleware, returnRoutes); // Register return routes
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

// Setup Socket.io
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for local network access
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join_with_key', async (key) => {
    try {
      const user = await User.findOne({ currentSessionKey: key });
      if (user) {
        const roomName = user._id.toString();
        socket.join(roomName);
        socket.emit('key_valid', { valid: true, merchantId: roomName });
        console.log(`Socket ${socket.id} joined room ${roomName}`);
      } else {
        socket.emit('key_valid', { valid: false });
      }
    } catch (error) {
      console.error('Socket join error:', error);
      socket.emit('key_valid', { valid: false });
    }
  });

  socket.on('send_qr', (data) => {
    // Expect data.merchantId to know which room to broadcast to
    if (data.merchantId) {
      io.to(data.merchantId).emit('display_qr', data);
    } else {
      // Fallback for legacy (though we are changing it)
      // io.emit('display_qr', data); 
      // Better to log error or do nothing to prevent leak
      console.error('send_qr received without merchantId');
    }
  });

  socket.on('clear_qr', (data) => {
    if (data && data.merchantId) {
      io.to(data.merchantId).emit('clear_qr');
    } else {
      // handle legacy or error
    }
  });

  socket.on('payment_success', (data) => {
    if (data && data.merchantId) {
      io.to(data.merchantId).emit('show_success');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
