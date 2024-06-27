const express = require('express');
const cors = require('cors');
const { scrapeLogic } = require('./scrapeLogic');

const app = express();

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/scrape', (req, res) => {
    scrapeLogic(req, res);
});

app.get('/', (req, res) => {
  res.send('Puppeteer server is running!');
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
