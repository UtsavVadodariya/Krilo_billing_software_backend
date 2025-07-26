const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const registerModels = require('../models/index');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    const databaseName = req.databaseName;
    if (!databaseName) {
      return cb(new Error('Database name not provided'));
    }
    const uploadPath = path.join('uploads', databaseName);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG/PNG images are allowed'));
  },
});

// POST create/update company settings (upsert)
router.post('/', upload.fields([
  { name: 'companyLogo', maxCount: 1 },
  { name: 'companySign', maxCount: 1 },
]), async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Upserting company settings for database:', databaseName);
    const { CompanySettings } = registerModels(databaseName);
    console.log('CompanySettings model retrieved for:', databaseName);

    const { companyName, address, country, state, city, pincode, GSTIN, termsAndConditions, bankName, accountNumber, IFSC, branch, contactNumber } = req.body;

    // Validate required fields
    if (!companyName || !address || !country || !state || !city || !pincode) {
      throw new Error('All required fields (companyName, address, country, state, city, pincode) must be provided');
    }

    // Prepare update data
    const updateData = {
      companyName: companyName.trim(),
      address: address.trim(),
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      GSTIN: GSTIN ? GSTIN.trim() : '',
      termsAndConditions: termsAndConditions ? termsAndConditions.trim() : '',
      bankDetails: {
        bankName: bankName ? bankName.trim() : '',
        accountNumber: accountNumber ? accountNumber.trim() : '',
        IFSC: IFSC ? IFSC.trim() : '',
        branch: branch ? branch.trim() : '',
      },
      contactNumber: contactNumber ? contactNumber.trim() : '',
    };

    // Handle file uploads
    if (req.files.companyLogo) {
      updateData.companyLogo = req.files.companyLogo[0].path;
    }
    if (req.files.companySign) {
      updateData.companySign = req.files.companySign[0].path;
    }

    // Upsert: Update if exists, create if not
    const settings = await CompanySettings.findOneAndUpdate(
      {}, // Single document per database
      { $set: updateData },
      { upsert: true, new: true, runValidators: true }
    );
    console.log('Company settings upserted:', { companyName, databaseName });
    res.status(201).json(settings);
  } catch (error) {
    console.error('Error upserting company settings:', { error: error.message, databaseName: req.databaseName });
    res.status(400).json({ error: 'Failed to upsert company settings: ' + error.message });
  }
});

// GET company settings
router.get('/', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching company settings for database:', databaseName);
    const { CompanySettings } = registerModels(databaseName);
    console.log('CompanySettings model retrieved for:', databaseName);
    const settings = await CompanySettings.findOne().select('-__v');
    if (!settings) {
      return res.status(404).json({ error: 'Company settings not found' });
    }
    console.log('Company settings fetched:', { companyName: settings.companyName, databaseName });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching company settings:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch company settings: ' + error.message });
  }
});

module.exports = router;