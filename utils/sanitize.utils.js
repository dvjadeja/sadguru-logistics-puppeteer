const { ToWords } = require('to-words');

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
    currencyOptions: {
      // can be used to override defaults for the selected locale
      name: 'Rupee',
      plural: 'Rupees',
      symbol: '₹',
      fractionalUnit: {
        name: 'Paisa',
        plural: 'Paise',
        symbol: '',
      },
    },
  },
});

const constructAmountToWords = (amount) => {
  if (!amount) return '';
  return toWords.convert(amount);
};

const constructCompanyAddress = (company) => {
  return `${company?.address}, ${company?.state}, ${company?.country}: ${company?.zipCode}`;
};

const constructBillingPartyAddress = (billingParty) => {
  return `${billingParty?.address || ''}, ${billingParty?.city || ''}, ${
    billingParty?.district || ''
  }, ${billingParty?.state || ''}: ${billingParty?.pincode}`;
};

const constructDate = (date) => {
  const newDate = new Date(date);
  const day = newDate.getDate();
  const month = newDate.getMonth() + 1;
  const year = newDate.getFullYear();
  return `${day}/${month}/${year}`;
};

const constructAmount = (data) => {
  if (!data) return '';

  if (isNaN(data)) {
    return 'N/A';
  } else {
    return parseFloat(data).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
};

// Function to remove whitespaces and convert to lower case
function normalizeString(str) {
  return str.replace(/\s+/g, '').toLowerCase();
}

// Function to group data
const transformLrInvoiceData = (data) => {
  const resultMap = {};
  const detentionMap = {};

  data.forEach((entry) => {
    const containerSize = normalizeString(entry.containerSize);
    const from = normalizeString(entry.from);
    const to = normalizeString(entry.to);
    const description = `${from} to ${to}`;
    const key = `${description}-${containerSize}-${entry.rate}`;

    if (resultMap[key]) {
      resultMap[key].totalAmount += entry.rate;
      resultMap[key].totalItems += 1;
    } else {
      resultMap[key] = {
        description: `${entry.from} to ${entry.to}`,
        containerSize: entry.containerSize,
        rate: entry.rate,
        totalAmount: entry.rate,
        totalItems: 1,
      };
    }

    if (entry.detentionAmount > 0) {
      const detentionKey = `DETENTION-${entry.containerSize}`;
      if (detentionMap[detentionKey]) {
        detentionMap[detentionKey].totalAmount += entry.detentionAmount;
        detentionMap[detentionKey].totalItems += 1;
      } else {
        detentionMap[detentionKey] = {
          description: `${entry.from} to ${entry.to} (DETENTION)`,
          containerSize: entry.containerSize,
          rate: entry.detentionAmount,
          totalAmount: entry.detentionAmount,
          totalItems: 1,
        };
      }
    }
  });

  const resultArray = Object.values(resultMap);
  const detentionArray = Object.values(detentionMap);

  return resultArray.concat(detentionArray);
};

module.exports = {
  constructAmountToWords,
  constructCompanyAddress,
  constructBillingPartyAddress,
  constructDate,
  constructAmount,
  transformLrInvoiceData,
  normalizeString,
};
