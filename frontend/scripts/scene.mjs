const canvas = document.getElementById("renderCanvas");
export const engine = new BABYLON.Engine(canvas, true, { stencil: true });
const divFps = document.getElementById("fps");
BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;
BABYLON.Database.IDBStorageEnabled = true;

let h_layer;
let guiTex;

import { defaultHeight, CAMERA_NAME } from './shared.mjs'

export function initScene(scene) {
    scene.collisionsEnabled = true;

    let camera = new BABYLON.ArcRotateCamera(CAMERA_NAME, Math.PI / 2, Math.PI / 3 , 20, new BABYLON.Vector3(0,defaultHeight*2,0), scene);
    scene.setActiveCameraByName(CAMERA_NAME);
    camera.panningSensibility = 150;
    camera.attachControl(canvas, true);

    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 100;

    camera.minZ = 1;
    camera.maxZ = 300;

    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    //scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

    //optimizeScene(scene);

    engine.runRenderLoop(function() {
        if(divFps) divFps.innerHTML = engine.getFps().toFixed() + " fps";
        camera.panningAxis = new BABYLON.Vector3(1, Math.cos(camera.beta), Math.sin(camera.beta));
        scene.render();
    });
}

/* let lastTimeout;
function optimizeScene(scene) {
    if(scene) {
        BABYLON.SceneOptimizer.OptimizeAsync(scene, BABYLON.SceneOptimizerOptions.ModerateDegradationAllowed(),
        function() {
            console.log('Optimizer success');
            lastTimeout = setTimeout(optimizeScene, 5000, scene);
        // On success
        }, function() {
            console.log('Optimizer fail');
            lastTimeout = setTimeout(optimizeScene, 5000, scene);
        // FPS target not reached
    });
    }
} */

export function resetScene(scene) {
/*     if(lastTimeout) { clearTimeout(lastTimeout); lastTimeout = undefined; } */
    if(scene) scene.dispose();
    if(h_layer) h_layer.dispose();
    if(guiTex) guiTex.dispose();

    const _scene = new BABYLON.Scene(engine);
    h_layer = new BABYLON.HighlightLayer("h_layer", _scene);
    guiTex = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("GUI");
    return _scene;
}

export function highlightMesh(mesh) {
    h_layer.addMesh(mesh, BABYLON.Color3.White());
}

export function unHighlightMesh(mesh) {
    h_layer.removeMesh(mesh);
}

export function toggleShowFps() {
    divFps.hidden = !divFps.hidden;
}

export function addGuiControl(control) {
    guiTex.addControl(control);
}

export function removeGuiControl(control) {
    guiTex.removeControl(control);
}

let showDebug = false;
export function toggleShowDebug(scene) {
    if(showDebug) {
        scene.debugLayer.hide();
        showDebug = false;
    } else {
        scene.debugLayer.show();
        showDebug = true;
    }
}