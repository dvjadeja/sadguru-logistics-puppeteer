const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URL = `${process.env.MONGO_URL}` || '';

mongoose.connect(MONGO_URL || '', {});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Error connecting MongoDb'));

db.on('open', () => {
  console.log('Database connected successfully.');
});

module.exports = { mongoose, db };
