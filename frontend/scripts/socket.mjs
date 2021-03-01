import { manifest, player, SceneManifest, Object, getScene, initScene, resetScene } from './scene.mjs'
import { Transform } from './globals.mjs'

export const socket = io({
    transports: ['websocket']
});

socket.on('load-scene', async (url, new_manifest) => {
    resetScene();
    initScene();
    await BABYLON.SceneLoader.AppendAsync('', url, getScene());
    if(new_manifest) {
        new_manifest.__proto__ = SceneManifest.prototype; new_manifest.fix_protos();
    }
    manifest.update_all(new_manifest, getScene());
    console.log('scene load client ' + url);
});

socket.on('load-mesh', async (name, object) => {
    if(object) { object.__proto__ = Object.prototype; object.fix_protos(); }
    manifest.update_single(name, object, getScene(), player);
    console.log('client mesh loaded ' + name);
});

socket.on('remove-mesh', (name) => {
    manifest.update_single(name, undefined, getScene(), player);
    console.log('client removed mesh ' + name);
});

socket.on('move-mesh', (name, transform) => {
    if(transform) { transform.__proto__ = Transform.prototype; transform.fix_protos(); }
    manifest.update_single_move(name, transform, getScene());
    console.log('client mesh move ' + name);
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