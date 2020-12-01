const fs = require('fs');

const BABYLON = require('babylonjs/babylon.max');
const LOADERS = require('babylonjs-loaders');
global.XMLHttpRequest = require('xhr2').XMLHttpRequest;

const engine = new BABYLON.NullEngine();
const scene = new BABYLON.Scene(engine);

BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

const SCENE_ROOT = `http://localhost:${process.env.PORT || 3000}/assets/`;
const SCENE_LOC = 'scene.babylon'

const time_=0.1;
var locationAnimation = {animation: new BABYLON.Animation('move', 'position', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3), time: time_};
var rotationAnimation = {animation: new BABYLON.Animation('rotate', 'rotation', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3), time: time_};
var scalingAnimation = {animation: new BABYLON.Animation('rotate', 'scaling', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3), time: time_};
const easingFunction = new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0);
locationAnimation.animation.setEasingFunction(easingFunction);
rotationAnimation.animation.setEasingFunction(easingFunction);
scalingAnimation.animation.setEasingFunction(easingFunction);

exports.registerIo = async function registerIo(io_) {

    var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 100, BABYLON.Vector3.Zero(), scene);

    try {
        BABYLON.SceneLoader.Append(SCENE_ROOT, SCENE_LOC, scene);
    } catch(ex) {
        console.error(`Could not load scene at ${SCENE_ROOT}${SCENE_LOC}`, ex);
    }
    
    const io = io_;
    io.on('connect', (socket) => {

        console.log('client connected');

        var serialized = BABYLON.SceneSerializer.Serialize(scene);
        serialized = 'data:' + JSON.stringify(serialized);
        socket.emit('stream-scene', serialized)
        socket.emit('stream-anim', locationAnimation, rotationAnimation, scalingAnimation);

        // stream from client
        socket.on('client-stream-mesh', (mesh, filename) => { //to substitute with filestream (?)
            BABYLON.SceneLoader.Append('', mesh, scene, () => {
                //if(filename == '') throw 400;
                //const stream = fs.createWriteStream(`./backend/assets/${filename}`);
                //mesh.pipe(stream);
                socket.broadcast.emit('stream-mesh', mesh);
                console.log('mesh streamed (added)');
            });
        });

        // load from server's fs
        socket.on('client-load-mesh', (url, location, vector) => {
            BABYLON.SceneLoader.ImportMesh(url, location, scene, () => {
                socket.broadcast.emit('load-mesh', url, location, vector);
                console.log('mesh loaded');
            }
            ).position = new BABYLON.Vector3(vector[0], vector[1], vector[2]);
        });

        socket.on('client-remove-mesh', (name) => {
            scene.removeMesh(scene.getMeshByName(name));
            socket.broadcast.emit('remove-mesh', name);
            console.log('removed mesh');
        });

        socket.on('client-move-mesh', (name, vector) => {
            moveMesh(scene.getMeshByName(name), vector, scene);
            socket.broadcast.emit('move-mesh', name, vector);
            console.log('mesh moved');
        });
    
    });

}

function moveMesh(mesh, vector, scene) {
    var vec = new BABYLON.Vector3(vector[0], vector[1], vector[2]);
    if(!mesh.position.equalsWithEpsilon(vec, 0.1)) {
        var lenght = BABYLON.Vector3.Distance(mesh.position, vec);
        var time = locationAnimation.time*lenght; //time per 1 lenght units //aka speed
        locationAnimation.animation.setKeys( [{frame: 0, value: mesh.position}, {frame: 60, value: vec}])

        mesh.animations[0] = locationAnimation.animation;
        scene.beginAnimation(mesh, 0, 60, false, 1/time);
    }
}

exports.runRenderLoop = function runRenderLoop() {
    engine.runRenderLoop(function() {
        scene.render();
    })
}