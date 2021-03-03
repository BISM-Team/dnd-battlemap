import express from 'express'
import 'express-async-errors'
import client from '../routes/client.js'
import assets from '../routes/assets.js'
import error from '../middleware/error.js'
import * as engineJs from './engine.mjs'
import responseTime from 'express-response-time'

export default function(app) {
    app.use((req, res, next) => {
        console.log(req.method + ' ' + req.originalUrl);
        next();
    })
    app.use(responseTime((method, url, time) => {
        console.log(`in ${time}ms`)
    }));

//    app.use(allow_CORS);
    app.use(express.json({ limit: '1mb' }));

    app.use('/assets', assets);
    app.use('/rooms', engineJs.router);
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