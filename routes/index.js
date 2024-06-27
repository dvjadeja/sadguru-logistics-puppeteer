const lorryReceiptInvoiceRoutes = require('./lorry-receipt-invoice.routes');

const invoiceRouter = (app) => {
  app.use('/api/v1/invoice/lorry-receipt', lorryReceiptInvoiceRoutes);
};

module.exports = { invoiceRouter };
