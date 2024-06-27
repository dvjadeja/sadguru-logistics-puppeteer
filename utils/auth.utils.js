const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const verifyToken = async (token) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  return new Promise((resolve, reject) => {
    jwt.verify(token, `${JWT_SECRET}`, (err, decoded) => {
      if (err) return reject(err);

      resolve(decoded);
    });
  });
};

module.exports = { verifyToken };
