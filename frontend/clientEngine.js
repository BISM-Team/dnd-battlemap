const socket = io();
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
var scene = new BABYLON.Scene(engine);
const divFps = document.getElementById("fps");

BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

window.addEventListener("resize", function() {
    engine.resize();
});

const time_=0.1;
var locationAnimation = {animation: new BABYLON.Animation('move', 'position', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3), time: time_};
var rotationAnimation = {animation: new BABYLON.Animation('rotate', 'rotation', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3), time: time_};
var scalingAnimation = {animation: new BABYLON.Animation('rotate', 'scaling', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3), time: time_};
const easingFunction = new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0);
locationAnimation.animation.setEasingFunction(easingFunction);
rotationAnimation.animation.setEasingFunction(easingFunction);
scalingAnimation.animation.setEasingFunction(easingFunction);

// syncronization events
{
    socket.on('stream-scene', async (data) => {
        await BABYLON.SceneLoader.AppendAsync('', data, scene);
        console.log('scene acquire client');
        initScene();
    });

    socket.on('load-scene', async (url, location) => {
        await BABYLON.SceneLoader.AppendAsync(url, location, scene);
        console.log('scene load client')
        initScene();
    });

    socket.on('stream-mesh', async (mesh) => {
        await BABYLON.SceneLoader.AppendAsync('', mesh, scene);
        console.log('client mesh added');
    });

    socket.on('load-mesh', async (url, location) => {
        await BABYLON.SceneLoader.AppendAsync(url, location, scene);
        console.log('client mesh loaded');
    });

    socket.on('remove-mesh', (name) => {
        mesh = scene.getMeshByName(name);
        scene.removeMesh(mesh, true);
        console.log('client removed mesh');
    });

    socket.on('move-mesh', (name, vector) => {
        mesh = scene.getMeshByName(name);
        moveMesh(mesh, vector, scene, true, false);
        console.log('client mesh move');
    });

    socket.on('disconnect', () => {
        if(socket.open().disconnected) throw 404;
    })
}

// drag and drop file
{
    canvas.addEventListener('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = 'load';
    });

    canvas.addEventListener('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    localUploadMesh(file);
    });
}

var defaultHeight = 2.0;
var terrainMesh = null;

// input controls
{
    var pickedMesh = null;
    var startPos = null;
    var moving = false;

    scene.onPointerDown = function (evt, pickResult) {
        // We try to pick an object
        if (pickResult.hit && (pickResult.pickedMesh != terrainMesh)) {
            moving = true;
            pickedMesh = pickResult.pickedMesh;
            startPos = [pickedMesh.position._x, pickedMesh.position._y, pickedMesh.position._z];
            const camera = scene.getCameraByName('arcCamera');
            camera.detachControl(canvas);
        }
    };

    scene.onPointerMove = function (evt, pickResult) {
        if(moving) {
            const pick = scene.pickWithRay(pickResult.ray, (mesh) => { return mesh==terrainMesh; });
            if(pick.pickedMesh) {
                pick.pickedPoint._y = startPos[1] + 0.5;
                pickedMesh.position = pick.pickedPoint;
            }
        }
    }

    scene.onPointerUp = function (evt, pickResult) {
        if(moving) {
            moving = false;
            const pick = scene.pickWithRay(pickResult.ray, (mesh) => { return mesh==terrainMesh; });
            const vec = pick.pickedMesh ? pick.pickedPoint : pickedMesh.position;
            const endPos = [vec._x, startPos[1], vec._z];
            pickedMesh.position = new BABYLON.Vector3(endPos[0], endPos[1], endPos[2]);
            moveMeshFromTo(pickedMesh, startPos, endPos, scene, false, true);

            const camera = scene.getCameraByName('arcCamera');
            camera.attachControl(canvas, true);
        }
    }

    const delKeyBind = 'Delete';
    canvas.addEventListener('keydown', (e) => {
        if(e.key == delKeyBind) {
            remove_mesh(pickedMesh);
            pickedMesh = null;
            moving = false;
        }
    });
}



var csmGenerator = null;
function initScene() {
    terrainMesh = scene.getMeshByName('Cube.001');
    scene.collisionsEnabled = true;

    var camera = new BABYLON.ArcRotateCamera("arcCamera", Math.PI / 2, Math.PI / 3 , 20, new BABYLON.Vector3(0,defaultHeight,0), scene);
    scene.setActiveCameraByName('arcCamera');
    camera.attachControl(canvas, true);

    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 100;

    camera.minZ = 1;
    camera.maxZ = 300;

    var ambientLight_Up_Down = new BABYLON.HemisphericLight('ambientLight_up', new BABYLON.Vector3(0, 1, 0), scene);
    var ambientLight_Down_Up = new BABYLON.HemisphericLight('ambientLight_down', new BABYLON.Vector3(0, -1, 0), scene);
    ambientLight_Up_Down.intensity = 0.3;
    ambientLight_Down_Up.intensity = 0.3;

    var light = scene.getNodeByName('Sun');
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
function moveMesh(mesh, vector, scene, executeOnClient, replicate_to_server) {
    var vec = new BABYLON.Vector3(vector[0], vector[1], vector[2]);
    if(!mesh.position.equalsWithEpsilon(vec, 0.2)) {
        if(executeOnClient) {
            unfreeze_csm();
            movingObjects++;

            const lenght = BABYLON.Vector3.Distance(mesh.position, vec);
            const time = locationAnimation.time*lenght; //time per 1 lenght units //aka speed
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

function moveMeshFromTo(mesh, start, end, scene, executeOnClient, replicate_to_server) {
    var _start = new BABYLON.Vector3(start[0], start[1], start[2]);
    var _end = new BABYLON.Vector3(end[0], end[1], end[2]);
    if(!_start.equalsWithEpsilon(_end, 0.2)) {
        if(executeOnClient) {
            unfreeze_csm();
            movingObjects++;

            const lenght = BABYLON.Vector3.Distance(_start, _end);
            const time = locationAnimation.time*lenght; //time per 1 lenght units //aka speed
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

function localUploadMesh(file) {
    const url = URL.createObjectURL(file);
    BABYLON.SceneLoader.Append('', url, scene, (newScene) => {
        const newMesh = newScene.meshes[newScene.meshes.length-1];
        newMesh.position = new BABYLON.Vector3(0.0, defaultHeight, 0.0);

        let name = newMesh.name;
        newMesh.name = "tmp";
        while(scene.getMeshByName(name) != null) {
            let index = 0;
            name = name + index;
        }
        newMesh.name = name;
        
        console.log(newMesh);
        var serialized = BABYLON.SceneSerializer.SerializeMesh(newMesh)
        serialized = 'data:' + JSON.stringify(serialized);
        socket.emit('client-stream-mesh', serialized);
    });
}

function localLoadMesh(url, location, vector) {
    BABYLON.SceneLoader.Append(url, location, scene, () => {
        socket.emit('client-load-mesh', url, location, vector);
    }
    ).position = new BABYLON.Vector3(vector[0], defaultHeight, vector[2]);
}

function remove_mesh(mesh) {
    scene.removeMesh(mesh);
    socket.emit('client-remove-mesh', mesh.name);
}