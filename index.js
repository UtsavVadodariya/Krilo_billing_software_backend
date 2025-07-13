const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const accountRoutes = require('./routes/accountRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(cors("http://krilobillingsoftware.easywayitsolutions.com"));
app.use(express.json());

// Connect to the main database
mongoose.connect('mongodb+srv://utsavvadodariya2008:Utsav%40162@cluster0.8a3idtg.mongodb.net/krilo_billing_software?retryWrites=true&w=majority&appName=Cluster0', {
// mongoose.connect('mongodb+srv://utsavvadodariya2008:Utsav@162@cluster0.8a3idtg.mongodb.net/krilo_billing_software', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected to krilo_billing_software');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

app.use('/api/auth', authRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/invoices', authMiddleware, invoiceRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);

app.listen(5000, () => console.log('Server running on port 5000'));