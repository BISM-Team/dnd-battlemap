import BABYLON from 'babylonjs'
import LOADERS from 'babylonjs-loaders'
import xhr2 from 'xhr2'
global.XMLHttpRequest = xhr2.XMLHttpRequest;

import { Transform } from '../../frontend/scripts/shared.mjs'
import { Player, SceneManifest, Object as _Object, Line } from '../../frontend/scripts/manifest.mjs'

BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

const SCENE_ROOT = `http://localhost:${process.env.PORT || 3000}/`;
const SCENE_LOC = 'assets/scene.babylon'

const player = new Player('server');

let io = null;
let instances = [];

export function initIo(_io) {
    io=_io;

    io.on('connect', (socket) => {
        const room = socket.handshake.query['room'];

        console.log('client connecting to room: ' +  room);
        let instance;
        if(room && (instance = instances.find(instance => { return instance.room == room; }))) {
            socket.join(room);
        } else {
            socket.disconnect(true);
            console.error('connection rejected: room not found ' + room);
        }
    });

    io.of("/").adapter.on('join-room', (room, id) => {
        const socket = io.of("/").sockets.get(id);
        if(!socket || room==id) return;

        let instance;
        if(instance = instances.find(instance => { return instance.room == room; })) // if the room exists
        {
            if(instance.players.findIndex(item => { return item.player.name == socket.handshake.auth['token']; }) == -1) { // if the player isn't in the room already
                // add player to instance
                instance.players.push({ player: new Player(socket.handshake.auth['token']), sid: id });
                console.log(instance.players);
                onJoinRoom(instance, socket);
                // send new player list
                io.to(room).emit('player-list', instance.players);
            } else { // player already in the room
                socket.leave(room);
                socket.disconnect(true);
                console.error('join rejected: player existant ' + room);
            }
        } else { // room not existant
            socket.leave(room);
            socket.disconnect(true);
            console.error('join rejected: room not found ' + room);
        }
    });

    io.of("/").adapter.on('leave-room', (room, id) => {
        const socket = io.of("/").sockets.get(id);
        let instance;
        if(instance = instances.find(instance => { return instance.room == room; })) {
            const name = socket.handshake.auth['token'];
            // remove player from instance
            instance.players.splice(instance.players.findIndex(item => { return item.player.name == name; }), 1);
            console.log(instance.players);
            // send new player list
            io.to(room).emit('player-list', instance.players);
        }
    });
}

export async function registerInstance(instance) {

    if(instances.find(_instance => { return _instance.room == instance.room; })) {
        return { ok: false, message: 'room already exists' };
    }
    const manifest = new SceneManifest(null);

    instance.manifest = manifest;
    instances.push(instance);

    console.log(instance.room + ': Room started');
    return { ok: true, message: 'creation successful' };
}

function onJoinRoom(instance, socket) {
    const manifest = instance.manifest;
    const room = instance.room;

    console.log(instance.room +': client connected');
    socket.emit('load-scene', SCENE_LOC, filterSceneOut(manifest));

    socket.on('client-load-object', async (filename, layer) => {
        const new_object = new _Object(player);
        new_object.name = filename;
        new_object.meshUrl = `assets/${filename}`;
        new_object.layer = layer;
        manifest.add(new_object);

        io.to(room).emit('load-object', new_object.name, new_object);
        console.log(instance.room +': object loaded ' + new_object.name);
    });

    socket.on('client-remove-object', (name) => {
        io.to(room).emit('remove-object', name);
        manifest.update_single(name, undefined, player);
        console.log(instance.room +': removed object ' + name);
    });

    socket.on('client-move-object', (name, transform) => {
        if(transform) { transform.__proto__ = Transform.prototype; transform.fix_protos(); }
        socket.to(room).emit('move-object', name, transform);
        manifest.update_single_move(name, transform);
        console.log(instance.room +': object moved ' + name);
    });

    socket.on('client-update-object', (name, new_object) => {
        if(!new_object || !manifest.find(name)) throw new Error('update undefined object, use other functions');
        new_object.__proto__ = _Object.prototype; 
        new_object.fix_protos();
        socket.to(room).emit('update-object', name, new_object);
        manifest.update_single(name, new_object, player);
        console.log(instance.room + ': object updated ' + name);
    });

    socket.on('client-update-line', (owner, new_line) => {
        if(owner) owner.__proto__ = Player.prototype;
        if(new_line) new_line.__proto__ = Line.prototype; 
        new_line.fix_protos();
        socket.to(room).emit('update-line', owner, new_line);
        manifest.updateLine(owner, new_line, player);
        console.log(instance.room + ': line updated ' + owner.name);
    });

    socket.on('client-remove-line', (owner) => {
        if(owner) owner.__proto__ = Player.prototype;
        io.to(room).emit('remove-line', owner);
        manifest.updateLine(owner, undefined, player);
        console.log(instance.room +': line removed ' + owner.name);
    });

    socket.on('disconnect', (reason) => {
        console.error(instance.room +': client disconnected: ', reason);
    });
}

function filterSceneOut(manifest) {
    return Object.keys(manifest)
    .filter(key => {return (key != '_scene');})
    .reduce((obj, key) => {
      obj[key] = manifest[key];
      return obj;
    }, {});
}