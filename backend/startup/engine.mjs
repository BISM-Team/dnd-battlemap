import * as engine from '../engine/engine.mjs'
import { Server } from 'socket.io'

import express from 'express'
export const router = express.Router();

class Instance {
    manifest = null;
    engine = null;
    room = '';
    players = []; // Player

    constructor(room) {
        this.room = room;
    };
}

let io = null;

export function startIoServer(server) {
    io = new Server(server, {
        transports: ['polling', 'websocket'],
        pingInterval: 5000,
        pingTimeout: 4000
    });
    engine.initIo(io);
}

async function startInstance(name) {
    if(!io) throw new Error('io server not started');
    return await engine.registerInstance(new Instance(name));
}

/* function stopInstance(name) {

} */

router.post('/:room', async (req, res) => {
    const result = await startInstance(req.params.room);
    if(!result) throw new Error('Room creation failed');
    if(result.ok) {
        res.status(200).send(result.message);
    } else {
        res.status(400).send(result.message);
    }
});