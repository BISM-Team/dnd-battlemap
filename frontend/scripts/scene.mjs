import { defaultHeight, CAMERA_NAME, setSceneGuiAndHighlightLayers } from './shared.mjs'

const canvas = document.getElementById("renderCanvas");
const divFps = document.getElementById("fps");
export const engine = new BABYLON.Engine(canvas, true, { stencil: true });
BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;
BABYLON.SceneLoader.ShowLoadingScreen = true;
BABYLON.Database.IDBStorageEnabled = true;

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

    engine.runRenderLoop(function() {
        if(divFps) divFps.innerHTML = engine.getFps().toFixed() + " fps";
        camera.panningAxis = new BABYLON.Vector3(1, Math.cos(camera.beta), Math.sin(camera.beta));
        scene.render();
    });
}

export function resetScene(scene) {
    if(scene) { scene.dispose(); engine.stopRenderLoop(); }

    const _scene = new BABYLON.Scene(engine);
    let h_layer = new BABYLON.HighlightLayer("h_layer", _scene);
    let guiTex = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("GUI");
    setSceneGuiAndHighlightLayers(h_layer, guiTex);
    return _scene;
}

export function toggleShowFps() {
    divFps.hidden = !divFps.hidden;
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