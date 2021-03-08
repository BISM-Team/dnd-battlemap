import { manifest, player, resetScene } from './controller.mjs'
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
        if(new_manifest) { new_manifest.__proto__ = SceneManifest.prototype; new_manifest.fix_protos(); }
        resetScene();
        await BABYLON.SceneLoader.AppendAsync('', url, manifest._scene);
        manifest.update_all(new_manifest);
        console.log('scene load client ' + url);
    });
    
    socket.on('load-mesh', async (name, object) => {
        if(object) { object.__proto__ = Object.prototype; object.fix_protos(); }
        manifest.update_single(name, object, player);
        console.log('client mesh loaded ' + name);
    });
    
    socket.on('remove-mesh', (name) => {
        manifest.update_single(name, undefined, player);
        console.log('client removed mesh ' + name);
    });
    
    socket.on('move-mesh', (name, transform) => {
        if(transform) { transform.__proto__ = Transform.prototype; transform.fix_protos(); }
        manifest.update_single_move(name, transform);
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

export function localUploadMesh(file) {
    let reader = new FileReader();
    let str = "";
    reader.onload = function(event) { str += event.target.result; }
    reader.onloadend = function(event) { 
        socket.emit('client-stream-mesh', file.name, str); 
        console.log('stream-file ' + file.name);
    }
    reader.readAsText(file);
}

export function sendLoadMeshFromUrl(filename) {
    socket.emit('client-load-mesh', filename);
    console.log('send load mesh ' + filename);
}

export function sendMoveMeshTo(lodName, transform) {
    const name = manifest.getMeshNameFromLod(lodName);
    socket.emit('client-move-mesh', name, transform);
    console.log('send move mesh ' + name);
}

export function sendRemoveMesh(lodName) {
    const name = manifest.getMeshNameFromLod(lodName);
    socket.emit('client-remove-mesh', name);
    console.log('send remove mesh ' + name);
}