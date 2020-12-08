import * as engine from '../engine/engine.mjs'
import socket_io from 'socket.io'

export default function(server) {
    const io = socket_io(server);
    engine.registerIo(io);
    engine.runRenderLoop();
}