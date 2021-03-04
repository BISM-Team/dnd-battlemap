const path = require('path');
const fs = require('fs');
const util = require('util');
const express = require('express');
const router = express.Router();

const readFile = util.promisify(fs.readFile);

router.get('/', async (req, res) => {
    const file = await readFile(`./frontend/mainPage.html`);
    if(file) { res.status(200).write(file); return res.end(); }
    return res.status(404).send('File not found');
});

router.get('/:filename', async (req, res) => {
    const file = path.join(__dirname, '../../frontend/', req.params.filename);
    try {
        res.sendFile(file);
    } catch (ex) {
        throw new Error('404');
    }
});

router.get('/:dirname/:filename', async (req, res) => {
    const file = path.join(__dirname, '../../frontend/', req.params.dirname, '/', req.params.filename);
    try {
        res.sendFile(file);
    } catch (ex) {
        throw new Error('404');
    }
});


module.exports = router;