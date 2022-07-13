import { engine, toggleShowFps, toggleShowDebug } from './scene.mjs'
import { Vector, Transform, TERRAIN_NAME, CAMERA_NAME, defaultHeight } from './shared.mjs'
import { sendRemoveObject, sendMoveObjTo, localUploadMesh, sendLoadMeshFromUrl, sendUpdateObject } from './connection.mjs'
import { manifest, onPickMesh, onStartMoveMesh, onUnpickMesh, active_layer, setActiveLayer } from './controller.mjs'

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

function canPick(mesh) {
    let object;
    return mesh.isPickable && (object=manifest.getObjectFromLod(mesh.name)) && (object.layer == active_layer || active_layer == -1); // can only pick objects from active layer
}

function canHit(mesh) {
    let object;
    return mesh!=pickedMesh && mesh.isPickable && (object=manifest.getObjectFromLod(mesh.name)) && object.layer < active_layer; // picked objects can only interact with lower layers
}

export function addSceneBindings(scene) {
    pickedMesh = null;
    tmpPickedMesh = null;
    moving = false;
    moved = false;

    scene.onPointerDown = function (evt, pickResult) {
        if(evt.button == 2) return;

        const pick = scene.pickWithRay(pickResult.ray, canPick);
        if (pick.hit) {
            if(pickedMesh && pickedMesh != scene.getMeshByName(TERRAIN_NAME)) {
                tmpPickedMesh = pick.pickedMesh;
            } else {
                tmpPickedMesh = null; 
                pickedMesh = pick.pickedMesh;
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
            const pick = scene.pickWithRay(pickResult.ray, canHit);
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
            if (pickedMesh != scene.getMeshByName(TERRAIN_NAME)) {
                const vec = pickedMesh.position;
                const endPos = new Vector(vec._x, vec._y-pickHeight, vec._z);
                endPos.y = endPos.y > defaultHeight ? endPos.y : defaultHeight;
                pickedMesh.position = new BABYLON.Vector3(endPos.x, endPos.y, endPos.z);
                const picked_obj = manifest.getObjectFromLod(pickedMesh.name)
                const transform = picked_obj.transform;
                const new_transform = new Transform(    endPos,
                                                        new Vector(transform.rotation.x, transform.rotation.y, transform.rotation.z), 
                                                        new Vector(transform.scaling.x, transform.scaling.y, transform.scaling.z));
                manifest.update_single_move(picked_obj.name, new_transform);
                sendMoveObjTo(picked_obj.name, new_transform); 

            }
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
                        sendRemoveObject(manifest.getMeshNameFromLod(pickedMesh.name));
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
                        rotateObject(manifest.getObjectFromLod(pickedMesh.name));
                    break;
                
                case scaleKeyBind:
                    if(pickedMesh)
                        scaleUpObject(manifest.getObjectFromLod(pickedMesh.name));
                    break;

                case unscaleKeyBind:
                    if(pickedMesh)
                        scaleDownObject(manifest.getObjectFromLod(pickedMesh.name));
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
                sendLoadMeshFromUrl(text, Math.max(0, active_layer));
            }
        });

        window.addEventListener("resize", function() {
            engine.resize();
        });
    }
}

export function rotateObject(obj) {
    let transform = obj.transform;
    const new_transform = new Transform(    new Vector(transform.location.x, transform.location.y, transform.location.z),   
                                            new Vector(transform.rotation.x, transform.rotation.y+rotationChange, transform.rotation.z), 
                                            new Vector(transform.scaling.x, transform.scaling.y, transform.scaling.z))
    manifest.update_single_move(obj.name, new_transform);
    sendMoveObjTo(obj.name, new_transform);
}

export function scaleUpObject(obj) {
    let transform = obj.transform;
    const new_transform = new Transform(    new Vector(transform.location.x, transform.location.y, transform.location.z),   
                                            new Vector(transform.rotation.x, transform.rotation.y, transform.rotation.z), 
                                            new Vector(transform.scaling.x+scaleChange, transform.scaling.y+scaleChange, transform.scaling.z+scaleChange))
    manifest.update_single_move(obj.name, new_transform);
    sendMoveObjTo(obj.name, new_transform);
}

export function scaleDownObject(obj) {
    let transform = obj.transform;
    const new_transform = new Transform(    new Vector(transform.location.x, transform.location.y, transform.location.z),   
                                            new Vector(transform.rotation.x, transform.rotation.y, transform.rotation.z), 
                                            new Vector(transform.scaling.x-scaleChange, transform.scaling.y-scaleChange, transform.scaling.z-scaleChange))
    manifest.update_single_move(obj.name, new_transform);
    sendMoveObjTo(obj.name, new_transform);
}

export function rotateToObject() {

}

export function scaleToObject() {

}

export function changeActiveLayer(l) {
    if(pickedMesh && l>=0) {
        const obj = manifest.getObjectFromLod(pickedMesh.name);
        if(obj) {
            obj.layer = l;
            sendUpdateObject(obj.name, obj)
        }
    }
    setActiveLayer(l);
}