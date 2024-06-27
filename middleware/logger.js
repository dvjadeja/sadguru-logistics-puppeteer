const crypto = require('crypto');

const requestMiddleware = (req, res, next) => {
  const responseId = crypto.randomUUID();

  res.locals.responseId = responseId;

  next();
};

module.exports = { requestMiddleware };
