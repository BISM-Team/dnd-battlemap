import * as engine from '../engine/engine.mjs'
import { Server } from 'socket.io'

import express from 'express'
export const router = express.Router();

class Instance {
    manifest = null;
    engine = null;
    scene = null;
    room = '';

    constructor(room) {
        this.room = room;
    };
}

let io = null;

export function startIoServer(server) {
    io = new Server(server, {
        maxHttpBufferSize: 1e8,
        transports: ['polling', 'websocket']
    });
    engine.initIo(io);
}

export async function startInstance(name) {
    if(!io) throw new Error('io server not started');
    const instance = new Instance(name);
    return await engine.registerInstance(instance);
}

export function stopInstance(name) {

}

router.post('/:room', async (req, res) => {
    const result = await startInstance(req.params.room);
    if(!result) throw new Error('Room creation failed');
    if(result.ok) {
        res.status(200).send(result.message);
    } else {
        res.status(400).send(result.message);
    }
});