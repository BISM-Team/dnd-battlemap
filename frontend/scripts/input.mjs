import { engine, toggleShowFps, toggleShowDebug } from './scene.mjs'
import { Vector, Transform, TERRAIN_NAME, CAMERA_NAME, defaultHeight } from './shared.mjs'
import { sendRemoveMesh, sendMoveMeshTo, localUploadMesh, sendLoadMeshFromUrl } from './connection.mjs'
import { manifest, onPickMesh, onStartMoveMesh, onUnpickMesh } from './controller.mjs'

const canvas = document.querySelector("#renderCanvas");
const fileInputs = document.getElementsByClassName("fileUpload");

const pickHeight = 0.5;

const delKeyBind = 'Delete';
const showFpsKeyBind = 'f';
const showDebugKeyBind = 'B';
const rotateKeyBind = 'r';
const scaleKeyBind = 's';
const unscaleKeyBind = 'S';

export let rotationChange = Math.PI/2;
export let scaleChange = 0.05;

let dom_init = false;

export let pickedMesh = null;
let tmpPickedMesh = null;
let moving = false;
let moved = false;

export function addSceneBindings(scene) {
    pickedMesh = null;
    tmpPickedMesh = null;
    moving = false;
    moved = false;

    scene.onPointerDown = function (evt, pickResult) {
        if(evt.button == 2) return;

        if (pickResult.hit) {
            if(pickedMesh && pickedMesh != scene.getMeshByName(TERRAIN_NAME)) {
                tmpPickedMesh = pickResult.pickedMesh;
            } else {
                tmpPickedMesh = null;
                pickedMesh = pickResult.pickedMesh;
                onPickMesh(pickedMesh);
            }
            if (pickedMesh != scene.getMeshByName(TERRAIN_NAME)) {
                moving = true;
                moved = false;
                const camera = scene.getCameraByName(CAMERA_NAME);
                camera.detachControl(canvas);
            }
        }
        else {
            if(pickedMesh) onUnpickMesh(pickedMesh);
            moving = false;
            moved = false;
            tmpPickedMesh = null;
            pickedMesh = null; // deselect if clicking nothing
        }
    };

    scene.onPointerMove = function (evt, pickResult) {
        if(moving) {
            const pick = scene.pickWithRay(pickResult.ray, (mesh) => { return mesh!=pickedMesh && mesh.isPickable; });
            if(pick.pickedMesh) {
                onStartMoveMesh(pickedMesh);
                moved = true;
                pick.pickedPoint._y += pickHeight;
                pickedMesh.position = new BABYLON.Vector3(pick.pickedPoint._x, pick.pickedPoint._y, pick.pickedPoint._z);
            }
        }
    }

    scene.onPointerUp = function (evt, pickResult) {
        if(tmpPickedMesh && !moved) {
            onUnpickMesh(pickedMesh);
            pickedMesh = tmpPickedMesh;
            tmpPickedMesh = null;
            onPickMesh(pickedMesh);
            if (pickedMesh != scene.getMeshByName(TERRAIN_NAME)) {
                moving = true;
                moved = false;
                const camera = scene.getCameraByName(CAMERA_NAME);
                camera.detachControl(canvas);
            }
        }
        if(pickedMesh && moved) {
            const vec = pickedMesh.position;
            const endPos = new Vector(vec._x, vec._y-pickHeight, vec._z);
            endPos.y = endPos.y > defaultHeight ? endPos.y : defaultHeight;
            pickedMesh.position = new BABYLON.Vector3(endPos.x, endPos.y, endPos.z);
            sendMoveMeshTo(pickedMesh.name, new Transform(endPos,   new Vector(pickedMesh.rotation._x, pickedMesh.rotation._y, pickedMesh.rotation._z), 
                                                                    new Vector(pickedMesh.scaling._x, pickedMesh.scaling._y, pickedMesh.scaling._z)));

            const camera = scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(canvas, true);
            onUnpickMesh(pickedMesh);
            tmpPickedMesh = null;
            pickedMesh = null;
        }
        else if(moving) {
            const camera = scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(canvas, true);
        }
        moving = false;
        moved = false;
    }

    if(!dom_init) {
        dom_init = true;
        canvas.addEventListener('keydown', (e) => {
            switch(e.key) 
            {
                case delKeyBind:
                    if(pickedMesh) {
                        onUnpickMesh(pickedMesh);
                        sendRemoveMesh(pickedMesh.name);
                        tmpPickedMesh = null;
                        pickedMesh = null;
                        moving = false;
                        moved = false;
                    }
                    break;
    
                case showFpsKeyBind:
                    toggleShowFps();
                    break;
    
                case showDebugKeyBind:
                    toggleShowDebug(manifest._scene);
                    break;
                    
                case rotateKeyBind:
                    if(pickedMesh)
                        rotateMesh(pickedMesh);
                    break;
                
                case scaleKeyBind:
                    if(pickedMesh)
                        scaleUpMesh(pickedMesh);
                    break;

                case unscaleKeyBind:
                    if(pickedMesh)
                        scaleDownMesh(pickedMesh);
                    break;

                default:
                    break;
            }
        });
        
        if(fileInputs) for (const i of fileInputs) {
            const fileInput = fileInputs[i];
            fileInput.addEventListener('dragover', (event) => {
                event.stopPropagation();
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
            });
            
            fileInput.addEventListener('drop', (event) => {
                event.stopPropagation();
                event.preventDefault();
                if(event.dataTransfer.files.length > 0) {
                    for(let file of event.dataTransfer.files) {
                        localUploadMesh(file);
                    }
                }
            });

            fileInput.addEventListener('change', () => {
                if(fileInput.files.length > 0) {
                    for(let file of fileInput.files) {
                        localUploadMesh(file);
                    }
                }
            });
        }

        canvas.addEventListener('dragover', (event) => {
            event.stopPropagation();
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        });
        
        canvas.addEventListener('drop', (event) => {
            event.stopPropagation();
            event.preventDefault();
            const text = event.dataTransfer.getData('text/plain');
            if(text) {
                // validate
                sendLoadMeshFromUrl(text);
            }
        });

        window.addEventListener("resize", function() {
            engine.resize();
        });
    }
}

export function rotateMesh(mesh) {
    let new_y = mesh.rotation._y+rotationChange;
    const new_transform = new Transform(    new Vector(mesh.position._x, mesh.position._y, mesh.position._z),   
                                            new Vector(mesh.rotation._x, new_y, mesh.rotation._z), 
                                            new Vector(mesh.scaling._x, mesh.scaling._y, mesh.scaling._z));
    manifest.update_single_move(manifest.getMeshNameFromLod(mesh.name), new_transform);
    sendMoveMeshTo(mesh.name, new_transform);
}

export function scaleUpMesh(mesh) {
    const new_transform = new Transform(    new Vector(mesh.position._x, mesh.position._y, mesh.position._z),   
                                            new Vector(mesh.rotation._x, mesh.rotation._y, mesh.rotation._z), 
                                            new Vector(mesh.scaling._x+scaleChange, mesh.scaling._y+scaleChange, mesh.scaling._z+scaleChange));
    manifest.update_single_move(manifest.getMeshNameFromLod(mesh.name), new_transform);
    sendMoveMeshTo(mesh.name, new_transform);
}

export function scaleDownMesh(mesh) {
    const new_transform = new Transform(    new Vector(mesh.position._x, mesh.position._y, mesh.position._z),   
                                            new Vector(mesh.rotation._x, mesh.rotation._y, mesh.rotation._z), 
                                            new Vector(mesh.scaling._x-scaleChange, mesh.scaling._y-scaleChange, mesh.scaling._z-scaleChange));
    manifest.update_single_move(manifest.getMeshNameFromLod(mesh.name), new_transform);
    sendMoveMeshTo(mesh.name, new_transform);
}

export function rotateToMesh() {

}

export function scaleToMesh() {

}