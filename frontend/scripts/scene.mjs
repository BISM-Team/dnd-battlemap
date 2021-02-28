export const canvas = document.getElementById("renderCanvas");
export const engine = new BABYLON.Engine(canvas, true, { stencil: true });

let scene = new BABYLON.Scene(engine);
export var h_layer = new BABYLON.HighlightLayer("h_layer", scene);

export function getScene() {
    return scene;
}

import {generateManifest, defaultHeight, TERRAIN_NAME, CAMERA_NAME, SUN_NAME, LocationAnimation} from './globals.mjs'
import {buildSceneLods, buildLods} from './mesh.mjs'
import {socket} from './socket.mjs'
import {addSceneBindings} from './DOM_bindings.mjs'
const divFps = document.getElementById("fps");

BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

export const {SceneManifest, Object, Player} = generateManifest(moveMeshTo, removeMesh, addMeshFromUrl);

export const player = new Player('sas');
export const manifest = new SceneManifest();

export function initScene() {
    buildSceneLods(scene);
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
    scene.dispose();
    h_layer.dispose();
    scene = new BABYLON.Scene(engine);
    h_layer = new BABYLON.HighlightLayer("h_layer", scene);
}

export function localUploadMesh(file) {
    let reader = new FileReader();
    let str = "";
    reader.onload = function(event) { str += event.target.result; }
    reader.onloadend = function(event) { socket.emit('client-stream-mesh', file.name, str); }
    reader.readAsText(file);
}

export function moveMeshTo(mesh, end) {
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


export async function addMeshFromUrl(url, lodNames) {
    let result = (await BABYLON.SceneLoader.ImportMeshAsync('', 'http://localhost:3000/', url, scene, null, '.babylon'));
    buildLods(result.meshes, scene);
    for(let i in result.meshes) {
        lodNames.push(result.meshes[i].name);
    }
    console.log('client mesh loaded ' + result.meshes[0].name);
}

export function removeMesh(mesh) {
    scene.removeMesh(mesh);
}

export function sendMoveMeshTo(name, transform) {
    const _name = manifest.getMeshNameFromLod(name);
    socket.emit('client-move-mesh', _name, transform);
}

export function sendRemoveMesh(name) {
    const _name = manifest.getMeshNameFromLod(name);
    socket.emit('client-remove-mesh', _name);
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