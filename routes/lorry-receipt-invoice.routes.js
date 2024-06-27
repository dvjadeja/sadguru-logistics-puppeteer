const express = require('express');

const router = express.Router();

const { isAuthenticated } = require('../middleware/index');
const {
  printLorryReceiptInvoice,
} = require('../controllers/lorryReceiptInvoice.controllers');

router.get('/print', isAuthenticated, printLorryReceiptInvoice);

module.exports = router;
