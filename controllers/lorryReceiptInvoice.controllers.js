const puppeteer = require('puppeteer');
const fs = require('fs');
const hbs = require('handlebars');
const { handleErrors, handleSuccess } = require('../utils/response.utils');
const { LorryReceiptInvoice, LorryReceipt } = require('../models');

const {
  constructCompanyAddress,
  constructAmount,
  constructAmountToWords,
  constructBillingPartyAddress,
  constructDate,
  transformLrInvoiceData,
} = require('../utils/sanitize.utils');

const printLorryReceiptInvoice = async (req, res) => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // '--single-process',
      '--no-zygote',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
    executablePath:
      process.env.NODE_ENV === 'production'
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  try {
    const { userId, company } = res.locals.user;
    const { invoiceId } = req.query;

    if (!invoiceId) throw new Error('Invoice not found');

    // Find LorryReceiptInvoice
    const lorryReceiptInvoice = await LorryReceiptInvoice.findOne({
      _id: invoiceId,
      createdBy: userId,
    })
      .populate('ledgerId')
      .populate('organizationDetails');

    if (!lorryReceiptInvoice) throw new Error('Invoice not found');

    const lorryReceipts = await LorryReceipt.find({
      _id: { $in: lorryReceiptInvoice?.lorryReceiptIds },
      createdBy: userId,
    }).populate('organizationDetails', [
      'companyName',
      'gst',
      'pan',
      'address',
      'country',
      'state',
      'zipCode',
      'logo',
      'stamp',
      'bankDetails',
    ]);

    if (lorryReceipts.length !== lorryReceiptInvoice?.lorryReceiptIds?.length)
      throw new Error('Lorry receipt(s) not found');

    const transformedLrData = transformLrInvoiceData(lorryReceipts);

    if (!transformedLrData) throw new Error('Lorry receipt(s) not found');
    const newTransformedData = transformedLrData?.map((data, index) => {
      return {
        srNo: `${index + 1}`,
        description: data?.description,
        containerSize: `${data?.containerSize}`,
        rate: `${constructAmount(data?.rate)}`,
        totalItems: `${data?.totalItems}`,
        amount: `${constructAmount(data?.totalAmount)}`,
      };
    });

    const html = fs.readFileSync('./templates/invoice/lr/index.html', 'utf-8');

    const template = hbs.compile(html);

    const companyName = lorryReceiptInvoice?.ownOrganization
      ? company?.name
      : lorryReceiptInvoice?.organizationDetails?.companyName;

    const address = lorryReceiptInvoice?.ownOrganization
      ? constructCompanyAddress(company)
      : constructCompanyAddress(lorryReceiptInvoice?.organizationDetails);

    const billingPartyName = lorryReceiptInvoice?.ledgerId?.legalName;

    const billinPartyAddress = constructBillingPartyAddress(
      lorryReceiptInvoice?.ledgerId?.address
    );

    const billingPartyPan = lorryReceiptInvoice?.ledgerId?.pan;
    const billingPartyGstin = lorryReceiptInvoice?.ledgerId?.gstin;
    const invoiceNo = lorryReceiptInvoice?.invoiceNo;
    const invoiceDate = constructDate(lorryReceiptInvoice?.invoiceDate);
    const dueDate = constructDate(lorryReceiptInvoice?.dueDate);
    const subTotal = constructAmount(lorryReceiptInvoice?.subTotal);
    const gstAmount = constructAmount(lorryReceiptInvoice?.gstAmount);
    const totalAmount = constructAmount(lorryReceiptInvoice?.totalAmount);
    const amountInWords = constructAmountToWords(
      lorryReceiptInvoice?.totalAmount
    );
    const companyPan = company?.pan;
    const companyGstin = company?.gst;
    const companyBankAccHolderName = company?.bankDetails?.accountHolderName;
    const companyBankAccNumber = company?.bankDetails?.accountNumber;
    const companyBankName = company?.bankDetails?.bankName;
    const companyIfscCode = company?.bankDetails?.ifscCode;
    const companyBranch = company?.bankDetails?.branch;
    const logo = lorryReceiptInvoice?.ownOrganization
      ? company?.logo
      : lorryReceiptInvoice?.organizationDetails?.logo;
    const stamp = lorryReceiptInvoice?.ownOrganization
      ? company?.stamp
      : lorryReceiptInvoice?.organizationDetails?.stamp;

    const payloadData = {
      companyName: companyName || '',
      address: address || '',
      billingPartyName: billingPartyName || '',
      billinPartyAddress: billinPartyAddress || '',
      billingPartyPan: billingPartyPan || 'N/A',
      billingPartyGstin: billingPartyGstin || 'N/A',
      invoiceNo: invoiceNo || '',
      invoiceDate: invoiceDate || '',
      dueDate: dueDate || '',
      subTotal: subTotal || '',
      gstAmount: gstAmount || 0,
      totalAmount: totalAmount || '',
      amountInWords: amountInWords || '',
      companyPan: companyPan || '',
      companyGstin: companyGstin || '',
      companyBankAccHolderName: companyBankAccHolderName || '',
      companyBankAccNumber: companyBankAccNumber || '',
      companyBankName: companyBankName || '',
      companyIfscCode: companyIfscCode || '',
      companyBranch: companyBranch || '',
      logo: logo || '',
      stamp: stamp || '',
      content: newTransformedData || [],
    };

    const htmlToSend = template(payloadData);

    const page = await browser.newPage();

    await page.setContent(htmlToSend);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');

    const buffer = Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength);

    // res.status(200).send(buffer);

    handleSuccess(res, {
      message: 'Invoice Downloaded successfully',
      data: buffer,
    });
  } catch (error) {
    handleErrors(req, res, {
      message: 'Error while printing lorry receipt invoice',
      error,
    });
  } finally {
    // Close the browser.
    await browser.close();
  }
};

module.exports = { printLorryReceiptInvoice };
