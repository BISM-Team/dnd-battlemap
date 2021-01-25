import {moveMesh, removeMeshes, initScene, scene, resetScene} from './scene.mjs'
import {buildLods, getLods} from './mesh.mjs'

export const socket = io({
    transports: ['websocket']
});

socket.on('stream-scene', async (data) => {
    resetScene();
    await BABYLON.SceneLoader.AppendAsync('', data, scene);
    console.log('scene acquire client');
    initScene();
});

socket.on('load-scene', async (url, location) => {
    resetScene();
    await BABYLON.SceneLoader.AppendAsync(url, location, scene);
    console.log('scene load client')
    initScene();
});

socket.on('stream-mesh', async (meshes) => {
    let resultMeshes = [];
    let i=0;
    while(i<meshes.length) {
        const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', meshes[i], scene);
        resultMeshes.push(result.meshes[0]);
        i++;
    }
    buildLods(resultMeshes, scene);
    console.log('client mesh added');
});

socket.on('load-mesh', async (url, location) => {
    await BABYLON.SceneLoader.AppendAsync(url, location, scene);
    console.log('client mesh loaded');
});

socket.on('remove-mesh', (name) => {
    const mesh = scene.getMeshByName(name);
    removeMeshes(getLods(mesh, scene), false);
    console.log('client removed mesh ' + mesh.name);
});

socket.on('move-mesh', (name, vector) => {
    let mesh = scene.getMeshByName(name);
    moveMesh(mesh, vector, scene, true, false);
    console.log('client mesh move' + mesh.name);
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