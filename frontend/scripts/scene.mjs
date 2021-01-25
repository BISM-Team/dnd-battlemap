export const canvas = document.getElementById("renderCanvas");
export const engine = new BABYLON.Engine(canvas, true);

export let scene = new BABYLON.Scene(engine);

import {defaultHeight, TERRAIN_NAME, CAMERA_NAME, SUN_NAME, LocationAnimation} from './globals.mjs'
import {buildSceneLods, buildLods} from './mesh.mjs'
import {socket} from './socket.mjs'
import {addSceneBindings} from './DOM_bindings.mjs'

const divFps = document.getElementById("fps");

BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

let csmGenerator = null;
export function initScene() {
    buildSceneLods(scene);
    addSceneBindings(scene);
    scene.collisionsEnabled = true;

    var camera = new BABYLON.ArcRotateCamera(CAMERA_NAME, Math.PI / 2, Math.PI / 3 , 20, new BABYLON.Vector3(0,defaultHeight,0), scene);
    scene.setActiveCameraByName(CAMERA_NAME);
    camera.attachControl(canvas, true);

    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 100;

    camera.minZ = 1;
    camera.maxZ = 300;

    var ambientLight_Up_Down = new BABYLON.HemisphericLight('ambientLight_up', new BABYLON.Vector3(0, 1, 0), scene);
    var ambientLight_Down_Up = new BABYLON.HemisphericLight('ambientLight_down', new BABYLON.Vector3(0, -1, 0), scene);
    ambientLight_Up_Down.intensity = 0.3;
    ambientLight_Down_Up.intensity = 0.3;

    var light = scene.getNodeByName(SUN_NAME);
    //csmGenerator =  new BABYLON.CascadedShadowGenerator(2048, light);
    //csmGenerator.getShadowMap().renderList = scene.meshes;
    freeze_csm();
    //csmGenerator.autoCalcDepthBoundsRefreshRate = 10;

    //var postProcess = new BABYLON.FxaaPostProcess("fxaa", 1.0, camera);
    //var tonemap = new BABYLON.TonemapPostProcess("tonemap", BABYLON.TonemappingOperator.Photographic, 2.0, camera);
    //var imgProcessing = new BABYLON.ImageProcessingPostProcess("processing", 1.0, camera);

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
    scene = new BABYLON.Scene(engine);
}

var freeze = false;
function freeze_csm() {
    if(!csmGenerator) return;
    if(freeze) {
        csmGenerator.autoCalcDepthBounds = false;
        csmGenerator.freezeShadowCastersBoundingInfo = true;
    } else {
        freeze = true;
        setTimeout(freeze_csm(csmGenerator), 100);
    }
}

function unfreeze_csm() {
    if(!csmGenerator) return;
    freeze = false;
    csmGenerator.autoCalcDepthBounds = false;
    csmGenerator.freezeShadowCastersBoundingInfo = false;
}

var movingObjects = 0;
export function moveMesh(mesh, vector, scene, executeOnClient, replicate_to_server) {
    var vec = new BABYLON.Vector3(vector[0], vector[1], vector[2]);
    if(!mesh.position.equalsWithEpsilon(vec, 0.2)) {
        if(executeOnClient) {
            unfreeze_csm();
            movingObjects++;

            const lenght = BABYLON.Vector3.Distance(mesh.position, vec);
            const locationAnimation = new LocationAnimation();
            const time = Math.pow(locationAnimation.time*lenght, 1/2); //time per 1 lenght units //aka speed
            locationAnimation.animation.setKeys( [{frame: 0, value: mesh.position}, {frame: 60, value: vec}])
            
            mesh.animations[0] = locationAnimation.animation;
            scene.beginAnimation(mesh, 0, 60, false, 1/time, function() {
                movingObjects--; 
                if(movingObjects==0) 
                    freeze_csm();
            });
        }
        if(replicate_to_server) {
            socket.emit('client-move-mesh', mesh.name, vector);
        }
    }
}

export function moveMeshFromTo(mesh, start, end, scene, executeOnClient, replicate_to_server) {
    var _start = new BABYLON.Vector3(start[0], start[1], start[2]);
    var _end = new BABYLON.Vector3(end[0], end[1], end[2]);
    if(!_start.equalsWithEpsilon(_end, 0.2)) {
        if(executeOnClient) {
            unfreeze_csm();
            movingObjects++;

            const lenght = BABYLON.Vector3.Distance(_start, _end);
            const locationAnimation = new LocationAnimation();
            const time = Math.pow(locationAnimation.time*lenght, 1/2); //time per 1 lenght units //aka speed
            locationAnimation.animation.setKeys( [{frame: 0, value: _start}, {frame: 60, value: _end}])
            
            mesh.animations[0] = locationAnimation.animation;
            scene.beginAnimation(mesh, 0, 60, false, 1/time, function() {
                movingObjects--; 
                if(movingObjects==0) 
                    freeze_csm();
            });
        }
        if(replicate_to_server) {
            socket.emit('client-move-mesh', mesh.name, end);
        }
    }
}

export async function localUploadMesh(file) {
    const url = URL.createObjectURL(file);

    const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", url, scene, null, '.babylon');
    result.meshes.sort((a, b) => {return a.name.charAt(a.name.length-1) - b.name.charAt(a.name.length-1)});
    
    result.meshes[0].position = new BABYLON.Vector3(0.0, result.meshes[0].name != TERRAIN_NAME ? defaultHeight : 0.0, 0.0);

    var serialized = [];
    let i=0;
    while(i<result.meshes.length) {
        let tmp = BABYLON.SceneSerializer.SerializeMesh(result.meshes[i]);
        serialized.push('data:' + JSON.stringify(tmp));
        i++;
    }
    socket.emit('client-stream-mesh', serialized);
    buildLods(result.meshes, scene);
}

export function localLoadMesh(url, location, vector) {
    BABYLON.SceneLoader.Append(url, location, scene, () => {
        socket.emit('client-load-mesh', url, location, vector);
    }
    ).position = new BABYLON.Vector3(vector[0], defaultHeight, vector[2]);
}

export function removeMesh(mesh, replicate_to_server) {
    if(replicate_to_server) socket.emit('client-remove-mesh', mesh.name);
    scene.removeMesh(mesh);
}

export function removeMeshes(meshes, replicate_to_server) {
    if(replicate_to_server) socket.emit('client-remove-mesh', meshes[0].name);
    meshes.forEach( mesh => {
        scene.removeMesh(mesh);
    });
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