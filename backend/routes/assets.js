const fs = require('fs');
const path = require('path');
const util = require('util');
const express = require('express');
const router = express.Router();

const readFile = util.promisify(fs.readFile);

const _babylon = new RegExp(/[.]*\.babylon$/);

router.get('/', async (req, res) => {
    await fs.readdir('./backend/assets', (err, files) => {
        files = files.filter( file => { return file.match(_babylon); } );
        if(files) res.status(400).send(files);
        else res.status(500).send('Error')
    });
})

router.get('/:filename', async (req, res) => {
    const stream = fs.createReadStream(`./backend/assets/${req.params.filename}`);
    if(stream) { res.status(200); return stream.pipe(res); }
    return res.status(404).send('File not found');
});

module.exports = router;