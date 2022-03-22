const fs = require('fs');
const path = require('path');
const util = require('util');
const express = require('express');
const router = express.Router();

const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const _anyfilename = new RegExp(/[^.\n]*\.(babylon|babylon\.manifest|env|jpg|png|img)$/);
const _babylon = new RegExp(/[^.\n]*\.babylon$/);

router.get('/', async (req, res) => {
    const files = (await readdir('./backend/assets')).filter( file => { return file.match(_babylon); } );;
    if(files) return res.status(200).send(files);
    else return res.status(500).send('Error');
})

router.get('/:filename', async (req, res) => {
    if(!req.params.filename.match(_anyfilename)) throw new Error(404);

    try {
        return res.sendFile(`${path.resolve()}/backend/assets/${req.params.filename}`);
    }
    catch(ex) {
        throw new Error(404);
    }
});

const fileBuffer = {};

router.post('/:filename', async (req, res) => {
    const filename = req.params.filename;
    const i = req.query['i'];
    const chunk = req.text;

    if(!filename.match(_anyfilename)) throw new Error(400);

    if(req.query['data'] == 'true') {
        console.log('add chunk ' + i + ' of ' + filename);
        if(!fileBuffer[filename]) {
            fileBuffer[filename] = {
                chunks: [{ i: i, chunk: chunk }],
                last_chunk: -1
            }
        } else {
            fileBuffer[filename].chunks.push({ i: i, chunk: chunk });
        }
    } else {
        console.log('set last chunk of ' + filename + 'to ' + i);
        if(!fileBuffer[filename]) {
            fileBuffer[filename] = {
                chunks: [],
                last_chunk: i
            }
        } else {
            fileBuffer[filename].last_chunk = i;
        }
    }
    await tryToFinishWrite(filename);
    res.status(200).end();
});

async function tryToFinishWrite(filename) {
    console.log('check if ' + fileBuffer[filename].chunks.length + ' != ' + fileBuffer[filename].last_chunk);
    if(fileBuffer[filename].chunks.length != fileBuffer[filename].last_chunk) return;
    
    console.log('pre sort ' + fileBuffer[filename].chunks.map(chunk => chunk.i));
    fileBuffer[filename].chunks = fileBuffer[filename].chunks.sort((a, b) => { return a.i - b.i; });
    console.log('post sort ' + fileBuffer[filename].chunks.map(chunk => chunk.i));

    let file = '';
    fileBuffer[filename].chunks.forEach(chunk => {
        file += chunk.chunk;
    });

    await writeFile(`./backend/assets/${filename}`, file);
    delete fileBuffer[filename];

    console.log('file streamed ' + filename);
}

module.exports = router;