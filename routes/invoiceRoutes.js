const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const registerModels = require('../models/index');

// Update these routes in your invoices router

router.get('/', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching invoices for database:', databaseName);
    const { Invoice } = registerModels(databaseName);
    const invoices = await Invoice.find()
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v')
      .sort({ createdAt: -1, _id: -1 }); // Sort by createdAt descending, then by _id descending as fallback
    console.log('Invoices fetched:', { count: invoices.length, databaseName });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch invoices: ' + error.message });
  }
});

router.get('/sales_invoice', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Fetching sales invoices for database:', databaseName);
    const { Invoice } = registerModels(databaseName);
    const invoices = await Invoice.find({ type: 'sales_invoice' })
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v')
      .sort({ createdAt: -1, _id: -1 }); // Sort by createdAt descending
    console.log('Sales invoices fetched:', { count: invoices.length, databaseName });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching sales invoices:', { error: error.message, databaseName: req.databaseName });
    res.status(500).json({ error: 'Failed to fetch sales invoices: ' + error.message });
  }
});

router.get('/customer', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    const { customerName, customerId } = req.query;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log(`Fetching invoices for database: ${databaseName}, customer: ${customerName || customerId || 'all'}`);
    const { Invoice } = registerModels(databaseName);
    if (!Invoice) {
      throw new Error('Invoice model not registered');
    }
    let query = {};
    if (customerId) {
      query.customerId = customerId;
    } else if (customerName) {
      query.customer = new RegExp(customerName.trim(), 'i');
    }
    const invoices = await Invoice.find(query)
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v')
      .sort({ createdAt: -1, _id: -1 }); // Sort by createdAt descending
    console.log(`Invoices fetched:`, { count: invoices.length, databaseName, customer: customerName || customerId || 'all' });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching customer invoices:', { 
      error: error.message, 
      databaseName: req.databaseName, 
      customerName,
      customerId,
      stack: error.stack 
    });
    res.status(500).json({ error: 'Failed to fetch customer invoices: ' + error.message });
  }
});


router.get('/:id/pdf', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Generating PDF for invoice:', req.params.id, 'database:', databaseName);
    const { Invoice, CompanySettings, Customer } = registerModels(databaseName);
    
    // First check if invoice exists
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    console.log('Invoice found:', { id: invoice._id, customerId: invoice.customerId, customer: invoice.customer });

    // Populate the invoice with related data
    const populatedInvoice = await Invoice.findById(req.params.id)
      .populate('products', 'name price stock gst hsn')
      .populate('customerId', 'name address country state city pincode GSTIN');

    if (!populatedInvoice) {
      return res.status(404).json({ error: 'Invoice not found after population' });
    }

    // Check if customer data is populated
    if (!populatedInvoice.customerId) {
      console.error('Customer not populated, trying to find customer manually');
      const customer = await Customer.findById(invoice.customerId);
      if (customer) {
        populatedInvoice.customerId = customer;
      } else {
        return res.status(404).json({ error: 'Customer not found for this invoice' });
      }
    }

    const companySettings = await CompanySettings.findOne();
    if (!companySettings) {
      return res.status(404).json({ error: 'Company settings not found' });
    }

    // Determine if IGST or CGST+SGST should be applied
    const companyState = companySettings.state || '';
    const customerState = populatedInvoice.customerId?.state || '';
    const isInterState = companyState.toLowerCase() !== customerState.toLowerCase();

    // Helper function to convert number to words (Indian format)
    const numberToWords = (num) => {
      if (num === 0) return 'Zero Rupees only';
      
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      const convertHundreds = (n) => {
        let result = '';
        if (n >= 100) {
          result += ones[Math.floor(n / 100)] + ' Hundred ';
          n %= 100;
        }
        if (n >= 20) {
          result += tens[Math.floor(n / 10)] + ' ';
          n %= 10;
        } else if (n >= 10) {
          result += teens[n - 10] + ' ';
          return result;
        }
        if (n > 0) {
          result += ones[n] + ' ';
        }
        return result;
      };

      const crores = Math.floor(num / 10000000);
      const lakhs = Math.floor((num % 10000000) / 100000);
      const thousands = Math.floor((num % 100000) / 1000);
      const hundreds = num % 1000;

      let result = '';
      if (crores > 0) result += convertHundreds(crores) + 'Crore ';
      if (lakhs > 0) result += convertHundreds(lakhs) + 'Lakh ';
      if (thousands > 0) result += convertHundreds(thousands) + 'Thousand ';
      if (hundreds > 0) result += convertHundreds(hundreds);

      return result.trim() + ' Rupees only';
    };

    // Calculate HSN-wise summary
    const hsnSummary = {};
    if (populatedInvoice.products && populatedInvoice.products.length > 0) {
      populatedInvoice.products.forEach((product, index) => {
        const quantity = populatedInvoice.quantities[index] || 0;
        const price = product.price || 0;
        const gstRate = product.gst || 0;
        const hsn = product.hsn || '28391900';
        const taxableAmount = price * quantity;
        
        if (!hsnSummary[hsn]) {
          hsnSummary[hsn] = {
            hsn: hsn,
            gstRate: gstRate,
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalAmount: 0
          };
        }
        
        hsnSummary[hsn].taxableAmount += taxableAmount;
        
        if (isInterState) {
          const igstAmount = (taxableAmount * gstRate) / 100;
          hsnSummary[hsn].igstAmount += igstAmount;
          hsnSummary[hsn].totalAmount += taxableAmount + igstAmount;
        } else {
          const cgstAmount = (taxableAmount * gstRate / 2) / 100;
          const sgstAmount = (taxableAmount * gstRate / 2) / 100;
          hsnSummary[hsn].cgstAmount += cgstAmount;
          hsnSummary[hsn].sgstAmount += sgstAmount;
          hsnSummary[hsn].totalAmount += taxableAmount + cgstAmount + sgstAmount;
        }
      });
    }

    // Create PDF with A4 size
    const doc = new PDFDocument({ 
      margin: 30,
      size: 'A4'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${populatedInvoice._id}.pdf`);
    doc.pipe(res);

    // Add watermark logo
    if (companySettings.companyLogo && fs.existsSync(companySettings.companyLogo)) {
      try {
        // Center the logo on A4 page (595x842 points, minus 30pt margins = 535x782 content area)
        // Place at center: x = (595 - 200) / 2 = 197.5, y = (842 - 100) / 2 = 421
        doc.save()
           .opacity(0.1)
           .image(companySettings.companyLogo, 197.5, 421, { width: 200, height: 100 })
           .restore();
      } catch (logoError) {
        console.warn('Failed to add company logo watermark:', logoError.message);
      }
    }

    // Helper function to draw bordered box
    const drawBox = (x, y, width, height) => {
      doc.rect(x, y, width, height).stroke();
    };

    // Header Section - Tax Invoice
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Tax Invoice', 0, 50, { align: 'center' });
    
    drawBox(30, 45, 535, 25);

    // Company Info Section
    let currentY = 85;
    doc.fontSize(16).font('Helvetica-Bold')
       .text(companySettings.companyName || 'COMPANY NAME', 0, currentY, { align: 'center' });
    
    currentY += 20;
    doc.fontSize(9).font('Helvetica');
    
    if (companySettings.address) {
      doc.text(companySettings.address, 0, currentY, { align: 'center' });
      currentY += 12;
    }
    
    if (companySettings.city) {
      const cityLine = `${companySettings.city}${companySettings.state ? ', ' + companySettings.state : ''}${companySettings.pincode ? ' ' + companySettings.pincode : ''}`;
      doc.text(cityLine, 0, currentY, { align: 'center' });
      currentY += 12;
    }
    
    if (companySettings.contactNumber) {
      doc.text(`Phone no.: ${companySettings.contactNumber}`, 0, currentY, { align: 'center' });
      currentY += 12;
    }
    
    if (companySettings.GSTIN) {
      doc.text(`GSTIN: ${companySettings.GSTIN}`, 0, currentY, { align: 'center' });
      currentY += 12;
    }

    currentY += 15;

    // Bill To and Invoice Details Section
    const billToY = currentY;
    drawBox(30, billToY, 535, 80);
    
    doc.fontSize(10).font('Helvetica-Bold')
       .text('Bill To', 40, billToY + 10);
    
    doc.fontSize(9).font('Helvetica');
    const customerData = populatedInvoice.customerId;
    let billToCurrentY = billToY + 25;
    
    if (customerData && customerData.name) {
      doc.font('Helvetica-Bold').text(customerData.name, 40, billToCurrentY);
      billToCurrentY += 12;
      doc.font('Helvetica');
      
      if (customerData.address) {
        doc.text(customerData.address, 40, billToCurrentY);
        billToCurrentY += 12;
      }
      if (customerData.city) {
        doc.text(customerData.city, 40, billToCurrentY);
        billToCurrentY += 12;
      }
      if (customerData.GSTIN) {
        doc.text(`GSTIN Number: ${customerData.GSTIN}`, 40, billToCurrentY);
        billToCurrentY += 12;
      }
      if (customerData.state) {
        doc.text(`State: ${customerData.state}`, 40, billToCurrentY);
      }
    } else {
      doc.font('Helvetica-Bold').text(populatedInvoice.customer || 'Customer Name', 40, billToCurrentY);
    }

    doc.fontSize(10).font('Helvetica-Bold')
       .text('Invoice Details', 400, billToY + 10);
    
    doc.fontSize(9).font('Helvetica');
    let invoiceDetailsY = billToY + 25;
    
    doc.text(`Invoice No.: INV-${populatedInvoice._id.toString().slice(-6)}`, 400, invoiceDetailsY);
    invoiceDetailsY += 12;
    doc.text(`Date: ${new Date(populatedInvoice.date || populatedInvoice.createdAt).toLocaleDateString('en-GB')}`, 400, invoiceDetailsY);
    invoiceDetailsY += 12;
    doc.text(`Place of Supply: ${customerState || companyState || '24-Gujarat'}`, 400, invoiceDetailsY);

    currentY = billToY + 90;

    // Main Invoice Table
    const tableStartY = currentY;
    const rowHeight = 25;
    const headerHeight = 35;
    
    let colWidths, headers;
    if (isInterState) {
      colWidths = [25, 120, 60, 40, 60, 60, 70, 70];
      headers = ['#', 'Item Name', 'HSN/SAC', 'Quantity', 'Price/Unit', 'Taxable Amount', 'IGST', 'Amount'];
    } else {
      colWidths = [25, 120, 60, 40, 60, 60, 50, 50, 70];
      headers = ['#', 'Item Name', 'HSN/SAC', 'Quantity', 'Price/Unit', 'Taxable Amount', 'CGST', 'SGST', 'Amount'];
    }
    
    const colPositions = [30];
    for (let i = 1; i < colWidths.length; i++) {
      colPositions[i] = colPositions[i-1] + colWidths[i-1];
    }

    drawBox(30, tableStartY, 535, headerHeight);
    
    doc.fontSize(8).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, colPositions[i] + 2, tableStartY + 8, { 
        width: colWidths[i] - 4, 
        align: i >= 4 ? 'right' : i === 0 || i === 2 || i === 3 ? 'center' : 'left' 
      });
    });

    colPositions.forEach((pos, i) => {
      if (i > 0) {
        doc.moveTo(pos, tableStartY).lineTo(pos, tableStartY + headerHeight).stroke();
      }
    });

    currentY = tableStartY + headerHeight;

    // Table rows
    let totalTaxableAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalAmount = 0;

    if (populatedInvoice.products && populatedInvoice.products.length > 0) {
      populatedInvoice.products.forEach((product, index) => {
        const quantity = populatedInvoice.quantities[index] || 0;
        const price = product.price || 0;
        const gstRate = product.gst || 0;
        const taxableAmount = price * quantity;
        
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let itemTotal = 0;

        if (isInterState) {
          igstAmount = (taxableAmount * gstRate) / 100;
          itemTotal = taxableAmount + igstAmount;
          totalIGST += igstAmount;
        } else {
          cgstAmount = (taxableAmount * gstRate / 2) / 100;
          sgstAmount = (taxableAmount * gstRate / 2) / 100;
          itemTotal = taxableAmount + cgstAmount + sgstAmount;
          totalCGST += cgstAmount;
          totalSGST += sgstAmount;
        }

        totalTaxableAmount += taxableAmount;
        totalAmount += itemTotal;

        drawBox(30, currentY, 535, rowHeight);
        
        colPositions.forEach((pos, i) => {
          if (i > 0) {
            doc.moveTo(pos, currentY).lineTo(pos, currentY + rowHeight).stroke();
          }
        });

        doc.fontSize(8).font('Helvetica');
        
        let rowData;
        if (isInterState) {
          rowData = [
            (index + 1).toString(),
            (product.name || 'Unknown Product').toUpperCase(),
            product.hsn || '28391900',
            quantity.toString(),
            `INR ${price.toFixed(2)}`,
            `INR ${taxableAmount.toFixed(2)}`,
            `INR ${igstAmount.toFixed(2)}\n(${gstRate}%)`,
            `INR ${itemTotal.toFixed(2)}`
          ];
        } else {
          rowData = [
            (index + 1).toString(),
            (product.name || 'Unknown Product').toUpperCase(),
            product.hsn || '28391900',
            quantity.toString(),
            `INR ${price.toFixed(2)}`,
            `INR ${taxableAmount.toFixed(2)}`,
            `INR ${cgstAmount.toFixed(2)}\n(${gstRate/2}%)`,
            `INR ${sgstAmount.toFixed(2)}\n(${gstRate/2}%)`,
            `INR ${itemTotal.toFixed(2)}`
          ];
        }

        rowData.forEach((data, i) => {
          const align = i >= 4 ? 'right' : i === 0 || i === 2 || i === 3 ? 'center' : 'left';
          doc.text(data, colPositions[i] + 2, currentY + 5, { 
            width: colWidths[i] - 4, 
            align: align 
          });
        });

        currentY += rowHeight;
      });
    }

    // Total row
    drawBox(30, currentY, 535, rowHeight);
    
    colPositions.forEach((pos, i) => {
      if (i > 0) {
        doc.moveTo(pos, currentY).lineTo(pos, currentY + rowHeight).stroke();
      }
    });

    doc.fontSize(8).font('Helvetica-Bold');
    
    let totalRowData;
    if (isInterState) {
      totalRowData = [
        'Total',
        '',
        populatedInvoice.products ? populatedInvoice.products.filter(p => p).length.toString() : '0',
        populatedInvoice.quantities ? populatedInvoice.quantities.reduce((sum, qty) => sum + (qty || 0), 0).toString() : '0',
        '',
        `INR ${totalTaxableAmount.toFixed(2)}`,
        `INR ${totalIGST.toFixed(2)}`,
        `INR ${(populatedInvoice.total || 0).toFixed(2)}`
      ];
    } else {
      totalRowData = [
        'Total',
        '',
        populatedInvoice.products ? populatedInvoice.products.filter(p => p).length.toString() : '0',
        populatedInvoice.quantities ? populatedInvoice.quantities.reduce((sum, qty) => sum + (qty || 0), 0).toString() : '0',
        '',
        `INR ${totalTaxableAmount.toFixed(2)}`,
        `INR ${totalCGST.toFixed(2)}`,
        `INR ${totalSGST.toFixed(2)}`,
        `INR ${(populatedInvoice.total || 0).toFixed(2)}`
      ];
    }

    totalRowData.forEach((data, i) => {
      const align = i >= 4 ? 'right' : i === 0 || i === 2 || i === 3 ? 'center' : 'left';
      doc.text(data, colPositions[i] + 2, currentY + 8, { 
        width: colWidths[i] - 4, 
        align: align 
      });
    });

    currentY += rowHeight + 15;

    // HSN-wise Tax Summary Table
    const hsnTableY = currentY;
    const hsnTableRowHeight = 20;
    const hsnSummaryArray = Object.values(hsnSummary);
    const hsnTableHeight = (hsnSummaryArray.length + 2) * hsnTableRowHeight; // +2 for header and total
    
    drawBox(30, hsnTableY, 535, hsnTableHeight);
    
    doc.fontSize(8).font('Helvetica-Bold');
    if (isInterState) {
      doc.text('HSN/SAC', 40, hsnTableY + 8);
      doc.text('Taxable Amount', 130, hsnTableY + 8);
      doc.text('IGST Rate', 220, hsnTableY + 8);
      doc.text('IGST Amount', 290, hsnTableY + 8);
      doc.text('Total Amount', 380, hsnTableY + 8);
      
      doc.moveTo(120, hsnTableY).lineTo(120, hsnTableY + hsnTableHeight).stroke();
      doc.moveTo(210, hsnTableY).lineTo(210, hsnTableY + hsnTableHeight).stroke();
      doc.moveTo(280, hsnTableY).lineTo(280, hsnTableY + hsnTableHeight).stroke();
      doc.moveTo(370, hsnTableY).lineTo(370, hsnTableY + hsnTableHeight).stroke();
    } else {
      doc.text('HSN/SAC', 40, hsnTableY + 8);
      doc.text('Taxable Amount', 120, hsnTableY + 8);
      doc.text('CGST Rate', 200, hsnTableY + 8);
      doc.text('CGST Amount', 260, hsnTableY + 8);
      doc.text('SGST Rate', 330, hsnTableY + 8);
      doc.text('SGST Amount', 390, hsnTableY + 8);
      doc.text('Total', 460, hsnTableY + 8);
      
      doc.moveTo(110, hsnTableY).lineTo(110, hsnTableY + hsnTableHeight).stroke();
      doc.moveTo(190, hsnTableY).lineTo(190, hsnTableY + hsnTableHeight).stroke();
      doc.moveTo(250, hsnTableY).lineTo(250, hsnTableY + hsnTableHeight).stroke();
      doc.moveTo(320, hsnTableY).lineTo(320, hsnTableY + hsnTableHeight).stroke();
      doc.moveTo(380, hsnTableY).lineTo(380, hsnTableY + hsnTableHeight).stroke();
      doc.moveTo(450, hsnTableY).lineTo(450, hsnTableY + hsnTableHeight).stroke();
    }

    doc.moveTo(30, hsnTableY + hsnTableRowHeight).lineTo(565, hsnTableY + hsnTableRowHeight).stroke();

    let hsnCurrentY = hsnTableY + hsnTableRowHeight;
    doc.fontSize(8).font('Helvetica');

    hsnSummaryArray.forEach((hsn, index) => {
      if (isInterState) {
        doc.text(hsn.hsn, 40, hsnCurrentY + 6);
        doc.text(`INR ${hsn.taxableAmount.toFixed(2)}`, 130, hsnCurrentY + 6);
        doc.text(`${hsn.gstRate}%`, 220, hsnCurrentY + 6);
        doc.text(`INR ${hsn.igstAmount.toFixed(2)}`, 290, hsnCurrentY + 6);
        doc.text(`INR ${hsn.totalAmount.toFixed(2)}`, 380, hsnCurrentY + 6);
      } else {
        doc.text(hsn.hsn, 40, hsnCurrentY + 6);
        doc.text(`INR ${hsn.taxableAmount.toFixed(2)}`, 120, hsnCurrentY + 6);
        doc.text(`${hsn.gstRate/2}%`, 200, hsnCurrentY + 6);
        doc.text(`INR ${hsn.cgstAmount.toFixed(2)}`, 260, hsnCurrentY + 6);
        doc.text(`${hsn.gstRate/2}%`, 330, hsnCurrentY + 6);
        doc.text(`INR ${hsn.sgstAmount.toFixed(2)}`, 390, hsnCurrentY + 6);
        doc.text(`INR ${hsn.totalAmount.toFixed(2)}`, 460, hsnCurrentY + 6);
      }
      
      hsnCurrentY += hsnTableRowHeight;
      if (index < hsnSummaryArray.length - 1) {
        doc.moveTo(30, hsnCurrentY).lineTo(565, hsnCurrentY).stroke();
      }
    });

    doc.moveTo(30, hsnCurrentY).lineTo(565, hsnCurrentY).stroke();
    doc.fontSize(8).font('Helvetica-Bold');

    if (isInterState) {
      doc.text('Total', 40, hsnCurrentY + 6);
      doc.text(`INR ${totalTaxableAmount.toFixed(2)}`, 130, hsnCurrentY + 6);
      doc.text('', 220, hsnCurrentY + 6);
      doc.text(`INR ${totalIGST.toFixed(2)}`, 290, hsnCurrentY + 6);
      doc.text(`INR ${totalAmount.toFixed(2)}`, 380, hsnCurrentY + 6);
    } else {
      doc.text('Total', 40, hsnCurrentY + 6);
      doc.text(`INR ${totalTaxableAmount.toFixed(2)}`, 120, hsnCurrentY + 6);
      doc.text('', 200, hsnCurrentY + 6);
      doc.text(`INR ${totalCGST.toFixed(2)}`, 260, hsnCurrentY + 6);
      doc.text('', 330, hsnCurrentY + 6);
      doc.text(`INR ${totalSGST.toFixed(2)}`, 390, hsnCurrentY + 6);
      doc.text(`INR ${totalAmount.toFixed(2)}`, 460, hsnCurrentY + 6);
    }

    currentY = hsnTableY + hsnTableHeight + 15;

    // Amount in Words
    drawBox(30, currentY, 535, 30);
    doc.fontSize(9).font('Helvetica-Bold')
       .text('Invoice Amount In Words', 40, currentY + 8);
    doc.fontSize(8).font('Helvetica')
       .text(numberToWords(Math.floor(populatedInvoice.total || 0)), 40, currentY + 20);

    currentY += 45;

    // Footer Section - Bank Details and Terms
    const footerY = currentY;
    const footerHeight = 120;
    
    drawBox(30, footerY, 267, footerHeight);
    doc.fontSize(9).font('Helvetica-Bold')
       .text('Bank Details', 40, footerY + 10);
    
    doc.fontSize(8).font('Helvetica');
    let bankDetailsY = footerY + 25;
    doc.text(`Name: ${companySettings.bankDetails?.bankName || 'Bank Of Baroda, Motiparabdi,'}`, 40, bankDetailsY);
    bankDetailsY += 12;
    doc.text('Gujarat', 40, bankDetailsY);
    bankDetailsY += 12;
    doc.text(`Account No.: ${companySettings.bankDetails?.accountNumber || '17910200000021'}`, 40, bankDetailsY);
    bankDetailsY += 12;
    doc.text(`IFSC code: ${companySettings.bankDetails?.IFSC || 'BARB0MOTIPA'}`, 40, bankDetailsY);
    bankDetailsY += 12;
    doc.text(`Account Holder's Name: ${companySettings.companyName || 'Company Name'}`, 40, bankDetailsY);

    drawBox(297, footerY, 268, footerHeight);
    doc.fontSize(9).font('Helvetica-Bold')
       .text('Terms and conditions', 307, footerY + 10);
    
    doc.fontSize(8).font('Helvetica')
       .text(companySettings.termsAndConditions || 'Thank you for doing business with us.', 307, footerY + 25);

    doc.fontSize(8).font('Helvetica')
       .text(`For: ${companySettings.companyName || 'COMPANY NAME'}`, 450, footerY + 60, { align: 'right' });

    if (companySettings.companySign && fs.existsSync(companySettings.companySign)) {
      try {
        doc.image(companySettings.companySign, 480, footerY + 75, { width: 60, height: 30 });
      } catch (signError) {
        console.warn('Failed to add company signature:', signError.message);
      }
    }
    
    doc.fontSize(8).font('Helvetica-Bold')
       .text('Authorized Signatory', 450, footerY + 105, { align: 'right' });

    doc.end();
    console.log('PDF generated successfully for invoice:', { id: populatedInvoice._id, databaseName });
  } catch (error) {
    console.error('Error generating invoice PDF:', { 
      error: error.message, 
      stack: error.stack,
      databaseName: req.databaseName,
      invoiceId: req.params.id
    });
    res.status(500).json({ error: 'Failed to generate invoice PDF: ' + error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Adding invoice for database:', databaseName);
    console.log('Received payload:', req.body);
    const { Product, Invoice, Account, Customer } = registerModels(databaseName);

    const { customerId, customer, type, products: productIds, quantities, total, totalReceived } = req.body;

    // Validate payload
    if (!customerId || !customer || typeof customer !== 'string' || !customer.trim()) {
      throw new Error('Invalid request: Customer ID and name are required');
    }
    if (!type || !['quotation', 'sales_order', 'sales_invoice', 'purchase_invoice'].includes(type)) {
      throw new Error('Invalid request: Invalid invoice type');
    }
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('Invalid request: Products array is required and cannot be empty');
    }
    if (!Array.isArray(quantities) || quantities.length === 0 || productIds.length !== quantities.length) {
      throw new Error(`Invalid request: Quantities array must match products array (received ${quantities.length} quantities, expected ${productIds.length})`);
    }

    // Validate customer
    const customerDoc = await Customer.findById(customerId);
    if (!customerDoc) {
      throw new Error('Invalid request: Customer not found');
    }
    if (customerDoc.name !== customer.trim()) {
      throw new Error('Invalid request: Customer name does not match customer ID');
    }

    const parsedTotal = parseFloat(total);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      throw new Error('Invalid request: Total amount must be a positive number');
    }

    const parsedQuantities = quantities.map((q) => {
      const parsed = parseInt(q, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error('Invalid request: All quantities must be positive integers');
      }
      return parsed;
    });

    const parsedTotalReceived = totalReceived !== undefined && totalReceived !== null && totalReceived !== '' ? parseFloat(totalReceived) : null;
    if (parsedTotalReceived !== null && parsedTotalReceived < 0) {
      throw new Error('Invalid request: Total received cannot be negative');
    }
    if (parsedTotalReceived !== null && parsedTotalReceived > parsedTotal) {
      throw new Error('Invalid request: Total received cannot exceed total amount');
    }

    const totalPendingAmount = parsedTotalReceived !== null ? parsedTotal - parsedTotalReceived : null;

    // Validate product IDs
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      throw new Error(`Invalid request: One or more products not found (found ${products.length}, expected ${productIds.length})`);
    }

    // Validate stock for sales_invoice
    if (type === 'sales_invoice') {
      for (let i = 0; i < productIds.length; i++) {
        const product = products.find((p) => p._id.toString() === productIds[i]);
        if (!product) {
          throw new Error(`Invalid request: Product not found: ${productIds[i]}`);
        }
        if (product.stock < parsedQuantities[i]) {
          throw new Error(`Insufficient stock for ${product.name}: ${product.stock} available, ${parsedQuantities[i]} requested`);
        }
      }
    }

    // Update product stock
    for (let i = 0; i < productIds.length; i++) {
      const product = products.find((p) => p._id.toString() === productIds[i]);
      const quantity = parsedQuantities[i];
      if (type === 'sales_invoice') {
        await Product.findByIdAndUpdate(
          product._id,
          { $inc: { stock: -quantity } },
          { runValidators: true }
        );
        console.log(`Stock decreased for ${product.name}: -${quantity}, new stock: ${product.stock - quantity}`);
      } else if (type === 'purchase_invoice') {
        await Product.findByIdAndUpdate(
          product._id,
          { $inc: { stock: quantity } },
          { runValidators: true }
        );
        console.log(`Stock increased for ${product.name}: +${quantity}, new stock: ${product.stock + quantity}`);
      }
    }

    // Create invoice
    const invoice = new Invoice({
      customerId,
      customer: customer.trim(),
      type,
      products: productIds,
      quantities: parsedQuantities,
      total: parsedTotal,
      totalReceived: parsedTotalReceived,
      totalPendingAmount,
      date: new Date(),
    });
    await invoice.save();
    console.log('Invoice created:', { 
      customerId,
      customer, 
      type, 
      total: parsedTotal, 
      quantities: parsedQuantities,
      totalReceived: parsedTotalReceived, 
      totalPendingAmount, 
      databaseName 
    });

    // Create account entries for sales_invoice
    if (type === 'sales_invoice') {
      const accountEntries = [];
      if (parsedTotalReceived === null) {
        // No payment details: credit full total to Accounts Receivable
        accountEntries.push({
          accountType: 'Accounts Receivable',
          type: 'credit',
          amount: parsedTotal,
          invoiceId: invoice._id,
          description: `Sales Invoice for ${customer}`,
          date: invoice.date,
        });
      } else if (parsedTotalReceived > 0) {
        // Payment details provided: credit and debit totalReceived
        accountEntries.push(
          {
            accountType: 'Accounts Receivable',
            type: 'credit',
            amount: parsedTotal,
            invoiceId: invoice._id,
            description: `Sales Invoice for ${customer}`,
            date: invoice.date,
          },
          {
            accountType: 'Accounts Receivable',
            type: 'debit',
            amount: parsedTotalReceived,
            invoiceId: invoice._id,
            description: `Payment received for ${customer}`,
            date: invoice.date,
          }
        );
      }
      if (accountEntries.length > 0) {
        await Account.insertMany(accountEntries);
        console.log('Account entries created for sales invoice:', { invoiceId: invoice._id, entries: accountEntries });
      }
    } else if (type === 'purchase_invoice') {
      const accountEntries = [
        {
          accountType: 'Purchase Revenue',
          type: 'debit',
          amount: parsedTotal,
          invoiceId: invoice._id,
          description: `Purchase Invoice for ${customer}`,
          date: invoice.date,
        },
      ];
      await Account.insertMany(accountEntries);
      console.log('Account entries created for purchase invoice:', { invoiceId: invoice._id });
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v');
    res.json(populatedInvoice);
  } catch (error) {
    console.error('Error creating invoice:', { error: error.message, databaseName: req.databaseName, body: req.body });
    res.status(500).json({ error: 'Failed to create invoice: ' + error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const databaseName = req.databaseName;
    if (!databaseName) {
      throw new Error('Database name not provided');
    }
    console.log('Updating invoice for database:', databaseName);
    console.log('Received payload:', req.body);
    const { Invoice, Account } = registerModels(databaseName);
    const { totalReceived } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const parsedTotalReceived = totalReceived !== undefined && totalReceived !== '' ? parseFloat(totalReceived) : invoice.totalReceived;
    if (parsedTotalReceived !== null && (isNaN(parsedTotalReceived) || parsedTotalReceived < 0)) {
      throw new Error('Invalid request: Total received must be a non-negative number');
    }
    if (parsedTotalReceived !== null && parsedTotalReceived > invoice.total) {
      throw new Error('Invalid request: Total received cannot exceed total amount');
    }

    const additionalReceived = parsedTotalReceived !== null ? parsedTotalReceived - (invoice.totalReceived || 0) : 0;
    const totalPendingAmount = parsedTotalReceived !== null ? invoice.total - parsedTotalReceived : null;

    invoice.totalReceived = parsedTotalReceived;
    invoice.totalPendingAmount = totalPendingAmount;
    await invoice.save();
    console.log('Invoice updated:', { 
      id: invoice._id, 
      totalReceived: parsedTotalReceived, 
      totalPendingAmount, 
      databaseName 
    });

    // Create account entry for additional payment
    if (additionalReceived > 0 && invoice.type === 'sales_invoice') {
      const accountEntry = {
        accountType: 'Accounts Receivable',
        type: 'debit',
        amount: additionalReceived,
        invoiceId: invoice._id,
        description: `Additional payment received for ${invoice.customer}`,
        date: new Date(),
      };
      await Account.create(accountEntry);
      console.log('Account entry created for additional payment:', { invoiceId: invoice._id, amount: additionalReceived });
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('products', 'name price stock')
      .populate('customerId', 'name address country state city pincode GSTIN')
      .select('-__v');
    res.json(populatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', { error: error.message, databaseName: req.databaseName, body: req.body });
    res.status(500).json({ error: 'Failed to update invoice: ' + error.message });
  }
});

module.exports = router;