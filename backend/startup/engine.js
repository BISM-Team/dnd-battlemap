const engine = require('../engine/engine.js');

module.exports = function(server) {
    const io = require('socket.io')(server);
    engine.registerIo(io);
    engine.runRenderLoop();
}