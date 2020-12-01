const path = require('path');
const fs = require('fs');
const util = require('util');
const express = require('express');
const router = express.Router();

const readFile = util.promisify(fs.readFile);

router.get('/', async (req, res) => {
    const file = await readFile(`./backend/assets/engine.html`);
    if(file) { res.status(200).write(file); return res.end(); }
    return res.status(404).send('File not found');
});

router.get('/:filename', async (req, res) => {
    const file = await readFile(`./frontend/${req.params.filename}`);
    if(file) { res.status(200).write(file); return res.end(); }
    return res.status(404).send('File not found');
});

router.get('/:dirname/:filename', async (req, res) => {
    try {
        const file = await readFile(`./frontend/${req.params.dirname}/${req.params.filename}`);
        if(file) { res.status(200).write(file); return res.end(); }
        else throw new Error();
    } catch(ex) {
        console.error(`${req.params.filename} not found`);
        return res.status(404).send(`${req.params.filename} not found`);
    }
});


module.exports = router;