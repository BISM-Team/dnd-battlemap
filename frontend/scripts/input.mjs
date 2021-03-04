import {engine, canvas, onPickMesh, onStartMoveMesh, onUnpickMesh, localUploadMesh, toggleShowFps, toggleShowDebug} from './scene.mjs'
import {Vector, Transform, TERRAIN_NAME, CAMERA_NAME} from './utils.mjs'
import { sendRemoveMesh, sendMoveMeshTo, sendLoadMeshFromUrl } from './socket.mjs'

const pickHeight = 0.5;

let dom_init = false;

export function addSceneBindings(scene) {
    let pickedMesh = null;
    let startPos = null;
    let moving = false;
    let moved = false;

    scene.onPointerDown = function (evt, pickResult) {
        // We try to pick an object
        if (pickResult.hit) {
            if(pickedMesh) onUnpickMesh(pickedMesh);
            pickedMesh = pickResult.pickedMesh;
            onPickMesh(pickedMesh);
            if (pickResult.pickedMesh != scene.getMeshByName(TERRAIN_NAME)) {
                moving = true;
                moved = false;
                startPos = new Vector(pickedMesh.position._x, pickedMesh.position._y, pickedMesh.position._z);
                const camera = scene.getCameraByName(CAMERA_NAME);
                camera.detachControl(canvas);
            }
        }
        else {
            onUnpickMesh(pickedMesh);
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
                pickedMesh.position = pick.pickedPoint;
            }
        }
    }

    scene.onPointerUp = function (evt, pickResult) {
        if(moving && moved) {
            moving = false;
            moved = false;
            const vec = pickedMesh.position;
            const endPos = new Vector(vec._x, vec._y-pickHeight, vec._z);
            pickedMesh.position = new BABYLON.Vector3(endPos.x, endPos.y, endPos.z);
            sendMoveMeshTo(pickedMesh.name, new Transform(endPos, new Vector(0, 0, 0), new Vector(1, 1, 1)));

            const camera = scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(canvas, true);

            onUnpickMesh(pickedMesh);
            pickedMesh = null;

        }
        else if(moving) {
            moving = false;
            moved = false;

            const camera = scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(canvas, true);
        }
    }

    if(!dom_init) {
        dom_init = true;

        const delKeyBind = 'Delete';
        const showFpsKeyBind = 'f';
        const showDebugKeyBind = 'B';
        canvas.addEventListener('keydown', (e) => {
            switch(e.key) 
            {
                case delKeyBind:
                    if(pickedMesh) {
                        onUnpickMesh(pickedMesh);
                        sendRemoveMesh(pickedMesh.name);
                        pickedMesh = null;
                        moving = false;
                    }
                    break;
    
                case showFpsKeyBind:
                    toggleShowFps();
                    break;
    
                case showDebugKeyBind:
                    toggleShowDebug();
                    break;
    
                default:
                    break;
            }
        });
        
        canvas.addEventListener('dragover', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Style the drag-and-drop as a "copy file" operation.
            event.dataTransfer.dropEffect = 'copy';
        });
        
        canvas.addEventListener('drop', (event) => {
            event.stopPropagation();
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            localUploadMesh(file);
        });

        window.addEventListener("resize", function() {
            engine.resize();
        });
    }
}