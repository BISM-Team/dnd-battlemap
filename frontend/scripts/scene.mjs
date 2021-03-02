export const {SceneManifest, Object, Player} = generateManifest(moveMeshTo, removeMesh, addMeshFromUrl);

export const canvas = document.getElementById("renderCanvas");
export const engine = new BABYLON.Engine(canvas, true, { stencil: true });
export const player = new Player('sas');
const divFps = document.getElementById("fps");
BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

export let manifest;
export let scene;
let h_layer;

import { socket } from './socket.mjs'
import { buildLods } from './mesh.mjs'
import { addSceneBindings } from './DOM_bindings.mjs'
import { generateManifest, defaultHeight, TERRAIN_NAME, CAMERA_NAME, SUN_NAME, LocationAnimation } from './globals.mjs'

export function initScene() {
    addSceneBindings(scene);
    scene.collisionsEnabled = true;

    let camera = new BABYLON.ArcRotateCamera(CAMERA_NAME, Math.PI / 2, Math.PI / 3 , 20, new BABYLON.Vector3(0,defaultHeight,0), scene);
    scene.setActiveCameraByName(CAMERA_NAME);
    camera.attachControl(canvas, true);

    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 100;

    camera.minZ = 1;
    camera.maxZ = 300;

    let ambientLight_Up_Down = new BABYLON.HemisphericLight('ambientLight_up', new BABYLON.Vector3(0, 1, 0), scene);
    let ambientLight_Down_Up = new BABYLON.HemisphericLight('ambientLight_down', new BABYLON.Vector3(0, -1, 0), scene);
    ambientLight_Up_Down.intensity = 0.3;
    ambientLight_Down_Up.intensity = 0.3;

    //let postProcess = new BABYLON.FxaaPostProcess("fxaa", 1.0, camera);
    //let tonemap = new BABYLON.TonemapPostProcess("tonemap", BABYLON.TonemappingOperator.Photographic, 2.0, camera);
    //let imgProcessing = new BABYLON.ImageProcessingPostProcess("processing", 1.0, camera);

    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

    //imgProcessing.exposure = 0.5;
    //imgProcessing.contrast = 5.0;

    engine.runRenderLoop(function() {
        if(divFps) divFps.innerHTML = engine.getFps().toFixed() + " fps";
        scene.render();
    });
}

export function resetScene() {
    manifest = new SceneManifest();
    if(scene) scene.dispose();
    if(h_layer) h_layer.dispose();
    scene = new BABYLON.Scene(engine);
    h_layer = new BABYLON.HighlightLayer("h_layer", scene);
}


export function localUploadMesh(file) {
    let reader = new FileReader();
    let str = "";
    reader.onload = function(event) { str += event.target.result; }
    reader.onloadend = function(event) { 
        socket.emit('client-stream-mesh', file.name, str); 
    }
    reader.readAsText(file);
}

export async function addMeshFromUrl(scene, url, lodNames) {
    let result = (await BABYLON.SceneLoader.ImportMeshAsync('', '', url, scene, null, '.babylon'));
    buildLods(result.meshes, scene);
    for(let i in result.meshes) {
        lodNames.push(result.meshes[i].name);
    }
    console.log('client mesh loaded ' + result.meshes[0].name);
}

export function moveMeshTo(scene, mesh, end) {
    let _start = new BABYLON.Vector3(mesh.position._x, mesh.position._y, mesh.position._z);
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

export function removeMesh(scene, mesh) {
    scene.removeMesh(mesh);
}


export function sendLoadMeshFromUrl(filename) {
    socket.emit('client-load-mesh', filename);
}

export function sendMoveMeshTo(name, transform) {
    const _name = manifest.getMeshNameFromLod(name);
    socket.emit('client-move-mesh', _name, transform);
    console.log('send move mesh '  + name);
}

export function sendRemoveMesh(name) {
    const _name = manifest.getMeshNameFromLod(name);
    socket.emit('client-remove-mesh', _name);
    console.log('send remove mesh '  + name);
}


export function toggleShowFps() {
    divFps.hidden = !divFps.hidden;
}

let showDebug = false;
export function toggleShowDebug() {
    if(showDebug) {
        scene.debugLayer.hide();
        showDebug = false;
    } else {
        scene.debugLayer.show();
        showDebug = true;
    }
}


export function onPickMesh(mesh) {
    if(mesh == scene.getMeshByName(TERRAIN_NAME)) return;
    const meshes = manifest.getAllMeshesFromLod(mesh.name, scene);
    meshes.forEach(_mesh => {
        h_layer.addMesh(_mesh, BABYLON.Color3.White());
    });
    // add options panel
}

export function onStartMoveMesh(mesh) {
    if(mesh == scene.getMeshByName(TERRAIN_NAME)) return;
    // remove options panel
}

export function onUnpickMesh(mesh) {
    if(mesh == scene.getMeshByName(TERRAIN_NAME)) return;
    const meshes = manifest.getAllMeshesFromLod(mesh.name, scene);
    meshes.forEach(_mesh => {
        h_layer.removeMesh(_mesh);
    });
    // remove options panel
}
