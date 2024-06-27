const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { handleSuccess } = require('./utils/response.utils');
const { requestMiddleware } = require('./middleware/logger');

const { mongoose } = require('./setups/mongo');
mongoose.connection;

const { invoiceRouter } = require('./routes');

const { scrapeLogic } = require('./scrapeLogic');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.use(requestMiddleware);

invoiceRouter(app);

app.use(requestMiddleware);

app.get('/scrape', (req, res) => {
  scrapeLogic(req, res);
});

app.get('/', (req, res) => {
  handleSuccess(res, {
    message: 'Express App: Sample App',
  });
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
