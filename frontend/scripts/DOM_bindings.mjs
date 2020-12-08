import {engine, canvas, localUploadMesh, moveMeshFromTo, removeMeshes, toggleShowFps} from './scene.mjs'
import {TERRAIN_NAME, CAMERA_NAME} from './globals.mjs'
import {getLods} from './mesh.mjs'

const pickHeight = 0.5;

let init = false;

export function addSceneBindings(scene) {
    let pickedMesh = null;
    let startPos = null;
    let moving = false;
    let moved = false;

    scene.onPointerDown = function (evt, pickResult) {
        // We try to pick an object
        if (pickResult.hit) {
            pickedMesh = pickResult.pickedMesh;
            if (pickResult.pickedMesh != scene.getMeshByName(TERRAIN_NAME)) {
                moving = true;
                moved = false;
                startPos = [pickedMesh.position._x, pickedMesh.position._y, pickedMesh.position._z];
                const camera = scene.getCameraByName(CAMERA_NAME);
                camera.detachControl(canvas);
            }
        }
        else pickedMesh = null; // deselect if clicking nothing
    };

    scene.onPointerMove = function (evt, pickResult) {
        if(moving) {
            const pick = scene.pickWithRay(pickResult.ray, (mesh) => { return mesh!=pickedMesh && mesh.isPickable; });
            if(pick.pickedMesh) {
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
            const endPos = [vec._x, vec._y-pickHeight, vec._z];
            pickedMesh.position = new BABYLON.Vector3(endPos[0], endPos[1], endPos[2]);
            moveMeshFromTo(pickedMesh, startPos, endPos, scene, false, true);

            const camera = scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(canvas, true);
        }
        else if(moving) {
            moving = false;
            moved = false;

            const camera = scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(canvas, true);
        }
    }

    const delKeyBind = 'Delete';
    const showFpsKeyBind = 'f';
    canvas.addEventListener('keydown', (e) => {
        switch(e.key) 
        {
            case delKeyBind:
                if(pickedMesh) {
                    removeMeshes(getLods(pickedMesh, scene), true);
                    pickedMesh = null;
                    moving = false;
                }
                break;

            case showFpsKeyBind:
                toggleShowFps();
                break;

            default:
                break;
        }
    });

    if(!init) {
        init = true;
        window.addEventListener("resize", function() {
            engine.resize();
        });
        
        canvas.addEventListener('dragover', (event) => {
            event.stopPropagation();
            event.preventDefault();
            // Style the drag-and-drop as a "copy file" operation.
            event.dataTransfer.dropEffect = 'load';
        });
        
        canvas.addEventListener('drop', async (event) => {
            event.stopPropagation();
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            await localUploadMesh(file);
        });
    }
}