const express = require('express');
const path = require('path');
// const port = process.env.PORT || 80;
const app = express();
const { port } = require('./config.js');

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(port, () => {
    console.log(`Listening on ${port}`);
});