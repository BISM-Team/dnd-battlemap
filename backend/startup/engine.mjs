import * as engine from '../engine/engine.mjs'
import { Server } from 'socket.io'

export default function(server) {
    const io = new Server(server, {
        maxHttpBufferSize: 1e8,
        transports: ['polling', 'websocket']
    });
    engine.registerIo(io);
    engine.runRenderLoop();
}