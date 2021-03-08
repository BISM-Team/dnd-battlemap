const fs = require('fs');
const path = require('path');
const util = require('util');
const express = require('express');
const router = express.Router();

const readdir = util.promisify(fs.readdir);
const _babylon = new RegExp(/[^.\n]*\.babylon$/);

router.get('/', async (req, res) => {
    const files = (await readdir('./backend/assets')).filter( file => { return file.match(_babylon); } );;
    if(files) return res.status(200).send(files);
    else return res.status(500).send('Error');
})

router.get('/:filename', async (req, res) => {
    try {
        return res.sendFile(`${path.resolve()}/backend/assets/${req.params.filename}`);
    }
    catch(ex) {
        throw new Error(404);
    }
});

module.exports = router;