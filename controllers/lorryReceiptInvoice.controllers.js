const puppeteer = require('puppeteer');
const fs = require('fs');
const hbs = require('handlebars');
const { handleErrors } = require('../utils/response.utils');

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

    const html = fs.readFileSync('./templates/invoice/lr/index.html', 'utf-8');

    const template = hbs.compile(html);

    const payloadData = {
      companyName: company.name,
    };

    const htmlToSend = template(payloadData);

    const page = await browser.newPage();

    await page.setContent(htmlToSend);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    res.setHeader('Content-Type', 'application/pdf');

    const buffer = Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength);

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

module.exports = { printLorryReceiptInvoice };
