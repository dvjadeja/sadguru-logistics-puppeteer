const puppeteer = require('puppeteer');
const fs = require('fs');
const hbs = require('handlebars');
const { handleErrors } = require('../utils/response.utils');
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

    console.log({
      responseId: res.locals.responseId,
      method: res.req.method,
      url: res.req.originalUrl,
      query: res.req.query,
    });

    res.status(200).send(buffer);

    // handleSuccess(res, {
    //   message: 'Invoice Downloaded successfully',
    //   data: buffer,
    // });
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

const printLorryReceiptAnnexure = async (req, res) => {
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
    const lorryReceiptInvoice = await LorryReceiptInvoice.findOne(
      {
        _id: invoiceId,
        createdBy: userId,
      },
      ['lorryReceiptIds', 'ownOrganization', 'organizationDetails']
    ).populate('organizationDetails', [
      'companyName',
      'address',
      'state',
      'zipCode',
      'country',
      'logo',
      'stamp',
    ]);

    const lorryReceipts = await LorryReceipt.find(
      {
        _id: { $in: lorryReceiptInvoice?.lorryReceiptIds },
        createdBy: userId,
      },
      [
        'date',
        'containerNo',
        'containerSize',
        'ownVehicle',
        'vehicleId',
        'marketTruckDetails',
        'from',
        'to',
        'rate',
        'detentionAmount',
      ]
    ).populate('vehicleId', ['registration.plateNumber']);

    if (!lorryReceipts) throw new Error('Lorry Receipt(s) not found');

    const newLorryReceipts = lorryReceipts.map((lorryReceipt, index) => {
      const srNo = `${index + 1}`;
      const lrDate = constructDate(lorryReceipt?.date);
      const containerNo = lorryReceipt?.containerNo;
      const containerSize = lorryReceipt?.containerSize;
      const vehicleNo = lorryReceipt?.ownVehicle
        ? lorryReceipt?.vehicleId?.registration?.plateNumber
        : lorryReceipt?.marketTruckDetails?.vehiclePlateNumber;
      const from = lorryReceipt?.from;
      const to = lorryReceipt?.to;
      const rate = constructAmount(lorryReceipt?.rate);
      const detentionAmount = constructAmount(lorryReceipt?.detentionAmount);
      const total = constructAmount(
        lorryReceipt?.rate + lorryReceipt?.detentionAmount
      );

      return {
        srNo: srNo || '',
        lrDate: lrDate || '',
        containerNo: containerNo || '',
        containerSize: containerSize || '',
        vehicleNo: vehicleNo || '',
        from: from || '',
        to: to || '',
        rate: rate || '',
        detentionAmount: detentionAmount || '',
        total: total || '',
      };
    });

    const companyName = lorryReceiptInvoice?.ownOrganization
      ? company?.name
      : lorryReceiptInvoice?.organizationDetails?.companyName;

    const address = lorryReceiptInvoice?.ownOrganization
      ? constructCompanyAddress(company)
      : constructCompanyAddress(lorryReceiptInvoice?.organizationDetails);

    const logo = lorryReceiptInvoice?.ownOrganization
      ? company?.logo
      : lorryReceiptInvoice?.organizationDetails?.logo;

    const totalRateAmount = lorryReceipts
      .map((lorryReceipt) => lorryReceipt.rate)
      .reduce((a, b) => a + b, 0);

    const totalDetentionAmount = lorryReceipts
      .map((lorryReceipt) => lorryReceipt.detentionAmount)
      .reduce((a, b) => a + b, 0);
    const totalAmountOfLorryReceipts = lorryReceipts
      .map((lorryReceipt) => lorryReceipt.rate + lorryReceipt.detentionAmount)
      .reduce((a, b) => a + b, 0);

    const payloadData = {
      companyName: companyName || '',
      address: address || '',
      logo: logo || '',
      content: newLorryReceipts,
      totalRateAmount: constructAmount(totalRateAmount) || '0',
      totalDetentionAmount: constructAmount(totalDetentionAmount) || '0',
      totalAmountOfLorryReceipts:
        constructAmount(totalAmountOfLorryReceipts) || '0',
    };

    const html = fs.readFileSync(
      './templates/invoice/lr/annexure.html',
      'utf-8'
    );

    const template = hbs.compile(html);

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

    console.log({
      responseId: res.locals.responseId,
      method: res.req.method,
      url: res.req.originalUrl,
      query: res.req.query,
    });

    res.status(200).send(buffer);
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

module.exports = { printLorryReceiptInvoice, printLorryReceiptAnnexure };
