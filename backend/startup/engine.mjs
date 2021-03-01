import * as engine from '../engine/engine.mjs'
import { Server } from 'socket.io'

class Instance {
    manifest = null;
    engine = null;
    scene = null;
    name = '';

    constructor(name) {
        this.name = name;
    };
}

let io = null;

export function startIoServer(server) {
    io = new Server(server, {
        maxHttpBufferSize: 1e8,
        transports: ['polling', 'websocket']
    });
}

export function startInstance(name) {
    const instance = new Instance(name);
    engine.registerIo(io, instance);
    engine.runRenderLoop(instance.engine, instance.scene);
    return instance;
}