import BABYLON from 'babylonjs'
import LOADERS from 'babylonjs-loaders'
import xhr2 from 'xhr2'
global.XMLHttpRequest = xhr2.XMLHttpRequest;

import { Connection } from './connection.mjs';
import { Manifest, Player, ObjectType } from '../../frontend/scripts/manifest.mjs';

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
    const manifest = new Manifest(player, new Connection(instance.room));

    instance.manifest = manifest;
    instances.push(instance);

    console.log(instance.room + ': Room started');
    return { ok: true, message: 'creation successful' };
}

function onJoinRoom(instance, socket) {
    const manifest = instance.manifest;
    const room = instance.room;

    console.log(instance.room +': client connected');
    socket.emit('load-scene', SCENE_LOC, filterJustScene(manifest));

    socket.on('client-remove-object', name => {
        manifest.remove(name, true, [socket]);
        console.log(instance.room +': removed object \"' + name + '\"');
    });

    socket.on('client-update-object', async new_object => {
        ObjectType.fix_object_prototype(new_object);
        await manifest.update(new_object, true, [socket]);
        console.log(instance.room + ': object updated \"' + new_object.name + '\"');
    });

    socket.on('disconnect', (reason) => {
        console.error(instance.room +': client disconnected: ', reason);
    });
}

function filterJustScene(manifest) {
    return Object.keys(manifest)
    .filter(key => {return (key == 'scene');})
    .reduce((obj, key) => {
      obj[key] = manifest[key];
      return obj;
    }, {});
}