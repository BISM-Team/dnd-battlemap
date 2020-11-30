const fs = require('fs');
const path = require('path');
const util = require('util');
const express = require('express');
const router = express.Router();

const readFile = util.promisify(fs.readFile);

router.get('/:filename', async (req, res) => {
    const stream = fs.createReadStream(`./backend/assets/${req.params.filename}`);
    if(stream) { res.status(200); return stream.pipe(res); }
    return res.status(404).send('File not found');
});

router.get('/', async (req, res) => {
    const file = await readFile(`./backend/assets/engine.html`);
    if(file) { res.status(200).write(file); return res.end(); }
    return res.status(404).send('File not found');
});

module.exports = router;