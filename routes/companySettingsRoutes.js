const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { CompanySettings } = require('../models_sql/index'); // SQL Model
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    // userId is injected by auth middleware
    if (!req.userId) {
      return cb(new Error('User ID not provided'));
    }
    // Using userId for folder separation or just a common uploads folder
    // For local env, let's keep using 'uploads/userId' or just 'uploads'
    const uploadPath = path.join('uploads', req.userId.toString());
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
    const userId = req.userId;
    console.log('Upserting company settings for userId:', userId);

    const { companyName, address, country, state, city, pincode, GSTIN, termsAndConditions, bankName, accountNumber, IFSC, branch, contactNumber, upiId, upiName } = req.body;

    // Validate required fields
    if (!companyName || !address || !country || !state || !city || !pincode) {
      throw new Error('All required fields (companyName, address, country, state, city, pincode) must be provided');
    }

    // Prepare update data
    const updateData = {
      a_application_login_id: userId, // Foreign Key
      companyName: companyName.trim(),
      address: address.trim(),
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      GSTIN: GSTIN ? GSTIN.trim() : '',
      termsAndConditions: termsAndConditions ? termsAndConditions.trim() : '',
      // Flattened Bank Details
      bankName: bankName ? bankName.trim() : '',
      bankAccountNumber: accountNumber ? accountNumber.trim() : '',
      bankIFSC: IFSC ? IFSC.trim() : '',
      bankBranch: branch ? branch.trim() : '',

      contactNumber: contactNumber ? contactNumber.trim() : '',
      upiId: upiId ? upiId.trim() : '',
      upiName: upiName ? upiName.trim() : '',
      printFormat: req.body.printFormat || 'POS',
    };

    if (req.body.invoiceFormat) {
      try {
        updateData.invoiceFormat = typeof req.body.invoiceFormat === 'string'
          ? JSON.parse(req.body.invoiceFormat)
          : req.body.invoiceFormat;
      } catch (e) {
        console.error('Failed to parse invoiceFormat:', e);
      }
    }

    // Handle file uploads
    if (req.files.companyLogo) {
      updateData.companyLogo = req.files.companyLogo[0].path;
    }
    if (req.files.companySign) {
      updateData.companySign = req.files.companySign[0].path;
    }

    // Upsert: Find one by userId, if exists update, else create
    let settings = await CompanySettings.findOne({ where: { a_application_login_id: userId } });

    if (settings) {
      await settings.update(updateData);
    } else {
      settings = await CompanySettings.create(updateData);
    }

    console.log('Company settings upserted:', { companyName, userId });
    res.status(201).json(settings);
  } catch (error) {
    console.error('Error upserting company settings:', { error: error.message, userId: req.userId });
    res.status(400).json({ error: 'Failed to upsert company settings: ' + error.message });
  }
});

// GET company settings
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Fetching company settings for userId:', userId);

    const settings = await CompanySettings.findOne({ where: { a_application_login_id: userId } });

    if (!settings) {
      // Return empty object or specific status if not set yet, but frontend expects 200 usually
      return res.status(200).json({});
    }

    // Remap flattened bank details back to nested object if frontend expects it
    const responseData = settings.toJSON();
    responseData.bankDetails = {
      bankName: responseData.bankName,
      accountNumber: responseData.bankAccountNumber,
      IFSC: responseData.bankIFSC,
      branch: responseData.bankBranch
    };

    console.log('Company settings fetched:', { companyName: settings.companyName, userId });
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching company settings:', { error: error.message, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch company settings: ' + error.message });
  }
});

module.exports = router;