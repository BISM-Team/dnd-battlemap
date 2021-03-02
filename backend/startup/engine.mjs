import * as engine from '../engine/engine.mjs'
import { Server } from 'socket.io'

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

export function startInstance(name) {
    const instance = new Instance(name);
    engine.registerInstance(instance);
}

export function stopInstance(name) {

}