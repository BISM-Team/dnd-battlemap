import BABYLON from 'babylonjs'
import LOADERS from 'babylonjs-loaders'
import xhr2 from 'xhr2'
global.XMLHttpRequest = xhr2.XMLHttpRequest;

import { Transform, Vector, defaultHeight, buildLods, sortMeshes, TERRAIN_NAME } from '../../frontend/scripts/shared.mjs'
import { Player, SceneManifest, Object as _Object } from '../../frontend/scripts/manifest.mjs'

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

    const engine = new BABYLON.NullEngine();
    const manifest = new SceneManifest(new BABYLON.Scene(engine));
    
    new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 100, BABYLON.Vector3.Zero(), manifest._scene);

    /*try {
        await BABYLON.SceneLoader.AppendAsync(SCENE_ROOT, SCENE_LOC, manifest._scene);
    } catch(ex) {
        console.error(instance.room +`: Could not load scene at ${SCENE_ROOT}${SCENE_LOC}`, ex);
    }*/

    engine.runRenderLoop(function() {
        manifest._scene.render();
    });

    instance.manifest = manifest;
    instance.engine = engine;
    instances.push(instance);

    console.log(instance.room + ': Room started');
    return { ok: true, message: 'creation successful' };
}

function onJoinRoom(instance, socket) {
    const manifest = instance.manifest;
    const scene = manifest._scene;
    const room = instance.room;

    console.log(instance.room +': client connected');
    socket.emit('load-scene', SCENE_LOC, filterSceneOut(manifest));

    socket.on('client-load-mesh', async (filename) => {
        const new_object = new _Object(player);
        new_object.name = filename;
        new_object.meshUrl = `assets/${filename}`;

        const result = await BABYLON.SceneLoader.ImportMeshAsync('', SCENE_ROOT, `assets/${filename}`, scene, null, '.babylon');
        buildLods(sortMeshes(result.meshes), scene);
        for(let i in result.meshes) {
            new_object.lodNames.push(result.meshes[i].name);
        }
        new_object.transform = new Transform(   new Vector(0.0, defaultHeight, 0.0), 
                                                new Vector(result.meshes[0].rotation._x, result.meshes[0].rotation._y, result.meshes[0].rotation._z), 
                                                new Vector(result.meshes[0].scaling._x, result.meshes[0].scaling._y, result.meshes[0].scaling._z));
        if(result.meshes[0].name == TERRAIN_NAME) { new_object.transform.location.y = 0.0; result.meshes[0].position.y = 0.0; }
        manifest.add(new_object);

        io.to(room).emit('load-mesh', new_object.name, new_object);
        console.log(instance.room +': mesh loaded ' + new_object.name);
    });

    socket.on('client-remove-mesh', (name) => {
        io.to(room).emit('remove-mesh', name);
        manifest.update_single(name, undefined, scene, player);
        console.log(instance.room +': removed mesh ' + name);
    });

    socket.on('client-move-mesh', (name, transform) => {
        if(transform) { transform.__proto__ = Transform.prototype; transform.fix_protos(); }
        socket.to(room).emit('move-mesh', name, transform);
        manifest.update_single_move(name, transform, scene);
        console.log(instance.room +': mesh moved ' + name);
    });

    socket.on('client-update-mesh', (name, new_object) => {
        if(!new_object || !manifest.find(name)) throw new Error('update undefined object, use other functions');
        new_object.__proto__ = _Object.prototype; 
        new_object.fix_protos();
        socket.to(room).emit('update-mesh', name, new_object);
        manifest.update_single(name, new_object, scene, player);
        console.log(instance.room + ': mesh updated ' + name);
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