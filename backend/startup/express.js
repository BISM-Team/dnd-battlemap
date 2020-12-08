const path = require('path');
const express = require('express');
require('express-async-errors');
const client = require('../routes/client');
const assets = require('../routes/assets');
const error = require('../middleware/error');
const responseTime = require('express-response-time');

module.exports = function(app) {
    app.use((req, res, next) => {
        console.log(req.method + ' ' + req.originalUrl);
        next();
    })
    app.use(responseTime((method, url, time) => {
        //console.log(`${method} ${url} ${time}ms`)
    }));

//    app.use(allow_CORS);
    app.use(express.json({ limit: '1mb' }));

    app.use('/assets', assets);
    app.use('/', client);
    app.use(error);
}

function allow_CORS(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Expose-Headers', 'x-auth-token');
    if(req.method === 'OPTIONS') return res.status(200).end();
    next();
}

function angularRouting(req, res, next) {
    const f_path = path.join(__dirname, '../../', '/frontend-trial/dist/frontend-trial/index.html/');
    res.sendFile(f_path);
}