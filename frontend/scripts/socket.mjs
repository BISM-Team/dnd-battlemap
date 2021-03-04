import { manifest, scene, player, initScene, resetScene } from './scene.mjs'
import { SceneManifest, Object } from './manifest.mjs'
import { Transform } from './utils.mjs'

export let socket;

export function connectToRoom(room) {
    socket = io({
        transports: ['websocket'],
        query: {
            'room': room
        }
    });

    socket.on('load-scene', async (url, new_manifest) => {
        resetScene();
        initScene();
        await BABYLON.SceneLoader.AppendAsync('', url, scene);
        if(new_manifest) {
            new_manifest.__proto__ = SceneManifest.prototype; new_manifest.fix_protos();
        }
        manifest.update_all(new_manifest, scene);
        console.log('scene load client ' + url);
    });
    
    socket.on('load-mesh', async (name, object) => {
        if(object) { object.__proto__ = Object.prototype; object.fix_protos(); }
        manifest.update_single(name, object, scene, player);
        console.log('client mesh loaded ' + name);
    });
    
    socket.on('remove-mesh', (name) => {
        manifest.update_single(name, undefined, scene, player);
        console.log('client removed mesh ' + name);
    });
    
    socket.on('move-mesh', (name, transform) => {
        if(transform) { transform.__proto__ = Transform.prototype; transform.fix_protos(); }
        manifest.update_single_move(name, transform, scene);
        console.log('client mesh moved ' + name);
    });
    
    socket.on('connect', () => {
        console.log('connected to server')
    });
    
    socket.on('connect_error', (error) => {
        console.error('connection error: ', error);
    });
    
    socket.on('disconnect', (reason) => {
        console.error('disconnected from server:', reason);
    });
}

export function sendLoadMeshFromUrl(filename) {
    socket.emit('client-load-mesh', filename);
}

export function sendMoveMeshTo(name, transform) {
    const _name = manifest.getMeshNameFromLod(name);
    socket.emit('client-move-mesh', _name, transform);
    console.log('send move mesh '  + _name);
}

export function sendRemoveMesh(name) {
    const _name = manifest.getMeshNameFromLod(name);
    socket.emit('client-remove-mesh', _name);
    console.log('send remove mesh '  + _name);
}