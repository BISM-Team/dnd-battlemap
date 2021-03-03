import 'newrelic'
import express from 'express'
const app = express();
const server = app.listen(process.env.PORT || 3000, '0.0.0.0');

import * as engineJs from './startup/engine.mjs'
import expressJs from './startup/express.mjs'

async function init() {
    expressJs(app);
    engineJs.startIoServer(server);
}

init();