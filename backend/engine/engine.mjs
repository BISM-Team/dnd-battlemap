import BABYLON from 'babylonjs'
import LOADERS from 'babylonjs-loaders'
import xhr2 from 'xhr2'
import fs from 'fs'
global.XMLHttpRequest = xhr2.XMLHttpRequest;

import { Transform, Vector,  LocationAnimation, defaultHeight, TERRAIN_NAME, buildLods } from '../../frontend/scripts/utils.mjs'
import { generateManifest, Player, SceneManifest, Object } from '../../frontend/scripts/manifest.mjs'

BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

const SCENE_ROOT = `http://localhost:${process.env.PORT || 3000}/`;
const SCENE_LOC = 'assets/scene.babylon'

generateManifest(moveMeshTo, removeMesh, () => {});

const player = new Player('server');

let io = null;
let instances = [];

export function initIo(_io) {
    io=_io;

    io.on('connect', (socket) => {
        const query = socket.request._query;
        socket.join(query['room']);
    });

    io.of("/").adapter.on('join-room', (room, id) => {
        const socket = io.of("/").sockets.get(id);
        if(!socket || room==id) return;

        let instance;
        if(instance = instances.find(instance => { return instance.room == room; })) {
            onJoinRoom(instance, socket);
        } else {
            socket.leave(room);
            socket.disconnect(true);
            console.error('Room not found ' + room);
        }
    });
}

export async function registerInstance(instance) {

    if(instances.find(_instance => { return _instance.room == instance.room; })) {
        return { ok: false, message: 'room already exists' };
    }

    const manifest = new SceneManifest();
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    
    new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 100, BABYLON.Vector3.Zero(), scene);

    try {
        await BABYLON.SceneLoader.AppendAsync(SCENE_ROOT, SCENE_LOC, scene);
    } catch(ex) {
        console.error(instance.room +`: Could not load scene at ${SCENE_ROOT}${SCENE_LOC}`, ex);
    }

    engine.runRenderLoop(function() {
        scene.render();
    });

    instance.manifest = manifest;
    instance.engine = engine;
    instance.scene = scene;
    instances.push(instance);

    console.log(instance.room + ': Room started');
    return { ok: true, message: 'creation successful' };
}

function onJoinRoom(instance, socket) {
    const manifest = instance.manifest;
    const scene = instance.scene;
    const room = instance.room;

    console.log(instance.room +': client connected');
    socket.emit('load-scene', SCENE_LOC, manifest);
    
    // stream from client
    socket.on('client-stream-mesh', async (filename, file) => {
        let result = {};
        const write_file  = async function() { await fs.writeFile(`./backend/assets/${filename}`, file); };
        const _import = async function(_result) { _result.result = await BABYLON.SceneLoader.ImportMeshAsync('', '', `data:${file}`, scene, null, '.babylon'); };
        await Promise.all([write_file, _import(result)]);
        result=result.result;
        
        const new_object = new Object(player);
        new_object.name = filename;
        new_object.transform = new Transform(new Vector(0.0, defaultHeight, 0.0), new Vector(0, 0, 0), new Vector(1.0, 1.0, 1.0));
        new_object.meshUrl = `assets/${filename}`;
        
        buildLods(result.meshes, scene);
        for(let i in result.meshes) {
            new_object.lodNames.push(result.meshes[i].name);
        }
        if(result.meshes[0].name == TERRAIN_NAME) { new_object.transform.location.y = 0.0; result.meshes[0].position.y = 0.0; }
        manifest.add(new_object);

        io.to(room).emit('load-mesh', new_object.name, new_object);
        console.log(instance.room +': mesh streamed ' + new_object.name);
    });

    socket.on('client-load-mesh', async (filename) => {
        const new_object = new Object(player);
        new_object.name = filename;
        new_object.transform = new Transform(new Vector(0.0, defaultHeight, 0.0), new Vector(0, 0, 0), new Vector(1.0, 1.0, 1.0));
        new_object.meshUrl = `assets/${filename}`;

        const result = await BABYLON.SceneLoader.ImportMeshAsync('', SCENE_ROOT, `asstets/${filename}`, scene, null, '.babylon');
        buildLods(result.meshes, scene);
        for(let i in result.meshes) {
            new_object.lodNames.push(result.meshes[i].name);
        }
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
        socket.to(room).emit('move-mesh', name, transform);
        manifest.update_single_move(name, transform, scene);
        console.log(instance.room +': mesh moved ' + name);
    });

    socket.on('client-update-object', (name, new_object) => {
        if(!new_object || !manifest.find(name)) throw new Error('update undefined object, use other functions');
        manifest.update_single(name, new_object, scene, player);
    });

    socket.on('disconnect', (reason) => {
        socket.leave(room);
        console.error(instance.room +': client disconnected: ', reason);
    });

}

function removeMesh(scene, mesh) {
    scene.removeMesh(mesh);
}

export function moveMeshTo(scene, mesh, end) {
    let _start = new BABYLON.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
    let _end = new BABYLON.Vector3(end.x, end.y, end.z);
    if(!_start.equalsWithEpsilon(_end, 0.2)) {
        const lenght = BABYLON.Vector3.Distance(_start, _end);
        const locationAnimation = new LocationAnimation();
        const time = Math.pow(locationAnimation.time*lenght, 1/2); //time per 1 lenght units //aka speed
        locationAnimation.animation.setKeys( [{frame: 0, value: _start}, {frame: 60, value: _end}])
        
        mesh.animations[0] = locationAnimation.animation;
        scene.beginAnimation(mesh, 0, 60, false, 1/time);
    }
}