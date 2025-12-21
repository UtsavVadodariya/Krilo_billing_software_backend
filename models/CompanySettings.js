const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
  },
  GSTIN: {
    type: String,
    trim: true,
    default: '',
  },
  companyLogo: {
    type: String, // File path or URL
    default: '',
  },
  companySign: {
    type: String, // File path or URL
    default: '',
  },
  termsAndConditions: {
    type: String,
    trim: true,
    default: '',
  },
  bankDetails: {
    bankName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    IFSC: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
  },
  contactNumber: {
    type: String,
    trim: true,
    default: '',
  },
  upiId: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function (v) {
        // If upiName is present, upiId is required.
        if (this.upiName && !v) return false;
        return true;
      },
      message: 'UPI ID is required when UPI Name is provided.'
    }
  },
  upiName: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function (v) {
        // If upiId is present, upiName is required.
        if (this.upiId && !v) return false;
        return true;
      },
      message: 'UPI Name is required when UPI ID is provided.'
    }
  },
}, {
  timestamps: true,
});

module.exports = companySettingsSchema;