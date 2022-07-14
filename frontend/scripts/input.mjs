import { engine, toggleShowFps, toggleShowDebug } from './scene.mjs'
import { Vector, Transform, TERRAIN_NAME, CAMERA_NAME, defaultHeight } from './shared.mjs'
import { sendRemoveObject, sendMoveObjTo, localUploadMesh, sendLoadMeshFromUrl, sendUpdateObject } from './connection.mjs'
import { manifest, onPickObj, onStartMoveObj, onUnpickObj, active_layer, setActiveLayer } from './controller.mjs'

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

let pickedObj = null;
let tmpPickedObj = null;
let moving = false;
let moved = false;

function canPick(mesh) {
    let object;
    return mesh.isPickable && (object=manifest.getObjectFromLod(mesh.name)) && (object.layer == active_layer || active_layer == -1); // can only pick objects from active layer
}

function canHit(mesh) {
    let object;
    return mesh.isPickable && (object=manifest.getObjectFromLod(mesh.name)) && object!=pickedObj && object.layer < active_layer; // picked objects can only interact with lower layers
}

export function addSceneBindings() {
    pickedObj = null;
    tmpPickedObj = null;
    moving = false;
    moved = false;

    manifest._scene.onPointerDown = function (evt, pickResult) {
        if(evt.button == 2) return;

        const pick = manifest._scene.pickWithRay(pickResult.ray, canPick);
        if (pick.hit) {
            const picked = manifest.getObjectFromLod(pick.pickedMesh.name);
            if(pickedObj && pickedObj != manifest.getObjectFromLod(TERRAIN_NAME)) {
                tmpPickedObj = picked;
            } else {
                tmpPickedObj = null; 
                pickedObj = picked;
                onPickObj(pickedObj);
            }
            if (pickedObj != manifest.getObjectFromLod(TERRAIN_NAME)) {
                moving = true;
                moved = false;
                const camera = manifest._scene.getCameraByName(CAMERA_NAME);
                camera.detachControl(canvas);
            }
        }
        else {
            if(pickedObj) onUnpickObj(pickedObj);
            moving = false;
            moved = false;
            tmpPickedObj = null;
            pickedObj = null; // deselect if clicking nothing
        }
    };

    manifest._scene.onPointerMove = function (evt, pickResult) {
        if(moving) {
            const pick = manifest._scene.pickWithRay(pickResult.ray, canHit);
            if(pick.pickedMesh) {
                if(!moved) onStartMoveObj(pickedObj);
                moved = true;
                pick.pickedPoint._y += pickHeight;
                manifest._scene.getMeshByName(pickedObj.lodNames[0]).position = new BABYLON.Vector3(pick.pickedPoint._x, pick.pickedPoint._y, pick.pickedPoint._z);
            }
        }
    }

    manifest._scene.onPointerUp = function (evt, pickResult) {
        if(tmpPickedObj && !moved) {
            onUnpickObj(pickedObj);
            pickedObj = tmpPickedObj;
            tmpPickedObj = null;
            onPickObj(pickedObj);
            if (pickedObj != manifest.getObjectFromLod(TERRAIN_NAME)) {
                moving = true;
                moved = false;
                const camera = manifest._scene.getCameraByName(CAMERA_NAME);
                camera.detachControl(canvas);
            }
        }
        if(pickedObj && moved) {
            if (pickedObj != manifest.getObjectFromLod(TERRAIN_NAME)) {
                const root_mesh = manifest._scene.getMeshByName(pickedObj.lodNames[0]);
                const vec = root_mesh.position;
                const endPos = new Vector(vec._x, vec._y-pickHeight, vec._z);
                endPos.y = endPos.y > defaultHeight ? endPos.y : defaultHeight;
                root_mesh.position = new BABYLON.Vector3(endPos.x, endPos.y, endPos.z);
                const transform = pickedObj.transform;
                const new_transform = new Transform(    endPos,
                                                        new Vector(transform.rotation.x, transform.rotation.y, transform.rotation.z), 
                                                        new Vector(transform.scaling.x, transform.scaling.y, transform.scaling.z));
                manifest.update_single_move(pickedObj.name, new_transform);
                sendMoveObjTo(pickedObj.name, new_transform); 

            }
            const camera = manifest._scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(canvas, true);
            onUnpickObj(pickedObj);
            tmpPickedObj = null;
            pickedObj = null;
        }
        else if(moving) {
            const camera = manifest._scene.getCameraByName(CAMERA_NAME);
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
                    if(pickedObj) {
                        onUnpickObj(pickedObj);
                        sendRemoveObject(pickedObj.name);
                        tmpPickedObj = null;
                        pickedObj = null;
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
                    if(pickedObj)
                        rotateObject(pickedObj);
                    break;
                
                case scaleKeyBind:
                    if(pickedObj)
                        scaleUpObject(pickedObj);
                    break;

                case unscaleKeyBind:
                    if(pickedObj)
                        scaleDownObject(pickedObj);
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
                if(active_layer>=0) sendLoadMeshFromUrl(text, active_layer);
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
    if(pickedObj && l>=0) {
        pickedObj.layer = l;
        sendUpdateObject(pickedObj.name, pickedObj)
    }
    setActiveLayer(l);
}