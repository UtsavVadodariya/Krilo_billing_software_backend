const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pin: { type: String },
  databaseName: { type: String, required: true, unique: true },
  currentSessionKey: { type: String },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
  subscriptionExpiry: { type: Date, default: () => new Date(+new Date() + 365 * 24 * 60 * 60 * 1000) }, // Default 1 year from now
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema, 'a_application_login_id');