const express = require('express');

const router = express.Router();

const { isAuthenticated } = require('../middleware/index');
const {
  printLorryReceiptInvoice,
  printLorryReceiptAnnexure,
} = require('../controllers/lorryReceiptInvoice.controllers');

router.get('/print', isAuthenticated, printLorryReceiptInvoice);

router.get('/print-annexure', isAuthenticated, printLorryReceiptAnnexure);

module.exports = router;
