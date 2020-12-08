import BABYLON from 'babylonjs'
import LOADERS from 'babylonjs-loaders'
import xhr2 from 'xhr2'
global.XMLHttpRequest = xhr2.XMLHttpRequest;

import {LocationAnimation} from '../../frontend/scripts/globals.mjs'
import {buildLods, buildSceneLods, getLods} from '../../frontend/scripts/mesh.mjs'

const engine = new BABYLON.NullEngine();
const scene = new BABYLON.Scene(engine);

BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

var defaultHeight = 0.6;

const SCENE_ROOT = `http://localhost:${process.env.PORT || 3000}/assets/`;
const SCENE_LOC = 'scene.babylon'

export async function registerIo(io_) {

    var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 100, BABYLON.Vector3.Zero(), scene);

    try {
        const newScene = await BABYLON.SceneLoader.AppendAsync(SCENE_ROOT, SCENE_LOC, scene);
        buildSceneLods(newScene);
    } catch(ex) {
        console.error(`Could not load scene at ${SCENE_ROOT}${SCENE_LOC}`, ex);
    }
    
    const io = io_;
    io.on('connect', (socket) => {

        console.log('client connected');

        var serialized = BABYLON.SceneSerializer.Serialize(scene);
        serialized = 'data:' + JSON.stringify(serialized);
        socket.emit('stream-scene', serialized);
//        socket.emit('stream-anim', locationAnimation, rotationAnimation, scalingAnimation);

        // stream from client
        socket.on('client-stream-mesh', async (meshes) => {
            socket.broadcast.emit('stream-mesh', meshes);
            let resultMeshes = [];
            let i=0;
            while(i<meshes.length) {
                const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', meshes[i], scene);
                resultMeshes.push(result.meshes[0]);
                i++;
            }
            buildLods(resultMeshes, scene);
            console.log('mesh streamed (added)');
        });

        // load from server's fs
        socket.on('client-load-mesh', async (url, location, vector) => {
            socket.broadcast.emit('load-mesh', url, location);
            await BABYLON.SceneLoader.ImportMeshAsync(url, location, scene);
            console.log('mesh loaded');
        });

        socket.on('client-remove-mesh', (name) => {
            socket.broadcast.emit('remove-mesh', name);
            removeMeshes(getLods(scene.getMeshByName(name), scene));
            console.log('removed mesh ' + name);
        });

        socket.on('client-move-mesh', (name, vector) => {
            socket.broadcast.emit('move-mesh', name, vector);
            moveMesh(scene.getMeshByName(name), vector, scene);
            console.log('mesh moved ' + name);
        });
    
    });
}

function removeMeshes(meshes) {
    meshes.forEach( mesh => {
        scene.removeMesh(mesh);
    });
}

function moveMesh(mesh, vector, scene) {
    var vec = new BABYLON.Vector3(vector[0], vector[1], vector[2]);
    if(!mesh.position.equalsWithEpsilon(vec, 0.1)) {
        const locationAnimation = new LocationAnimation();
        var lenght = BABYLON.Vector3.Distance(mesh.position, vec);
        var time = locationAnimation.time*lenght; //time per 1 lenght units //aka speed
        locationAnimation.animation.setKeys( [{frame: 0, value: mesh.position}, {frame: 60, value: vec}])

        mesh.animations[0] = locationAnimation.animation;
        scene.beginAnimation(mesh, 0, 60, false, 1/time);
    }
}

export function runRenderLoop() {
    engine.runRenderLoop(function() {
        scene.render();
    })
}