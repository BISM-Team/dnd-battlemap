import BABYLON from 'babylonjs'
import LOADERS from 'babylonjs-loaders'
import xhr2 from 'xhr2'
import fs from 'fs'
global.XMLHttpRequest = xhr2.XMLHttpRequest;

import { Transform, Vector, generateManifest, LocationAnimation, defaultHeight, TERRAIN_NAME } from '../../frontend/scripts/globals.mjs'
import { buildLods } from '../../frontend/scripts/mesh.mjs'

BABYLON.SceneLoader.loggingLevel = BABYLON.SceneLoader.DETAILED_LOGGING;

const SCENE_ROOT = `http://localhost:${process.env.PORT || 3000}/`;
const SCENE_LOC = 'assets/scene.babylon'

const {SceneManifest, Object, Player} = generateManifest(moveMeshTo, removeMesh, () => {});
    
const player = new Player('server');

export async function registerIo(io_, instance) {

    const manifest = new SceneManifest();
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const room = instance.room;
    instance.manifest = manifest;
    instance.engine = engine;
    instance.scene = scene;
    
    new BABYLON.ArcRotateCamera("Camera", 0, 0.8, 100, BABYLON.Vector3.Zero(), scene);

    try {
        await BABYLON.SceneLoader.AppendAsync(SCENE_ROOT, SCENE_LOC, scene);
    } catch(ex) {
        console.error(`Could not load scene at ${SCENE_ROOT}${SCENE_LOC}`, ex);
    }
    
    const io = io_;
    io.on('connect', (socket) => {
        socket.join(room);

        console.log('client connected ');
        socket.emit('load-scene', SCENE_LOC, manifest);
        
        // stream from client
        socket.on('client-stream-mesh', async (filename, file) => {
            let result = {};
            const write_file  = async function() { await fs.writeFile(`./backend/assets/${filename}`, file); };
            const _import = async function(_result) { _result.result = await BABYLON.SceneLoader.ImportMeshAsync('', '', `data:${file}`, scene, null, '.babylon'); };
            await Promise.all([write_file, _import(result)]);
            result=result.result;
            
            const new_object = new Object(player);
            new_object.name = filename;
            new_object.transform = new Transform(new Vector(0.0, defaultHeight, 0.0), new Vector(0, 0, 0), new Vector(1.0, 1.0, 1.0));
            new_object.meshUrl = `assets/${filename}`;
            
            buildLods(result.meshes, scene);
            for(let i in result.meshes) {
                new_object.lodNames.push(result.meshes[i].name);
            }
            if(result.meshes[0].name == TERRAIN_NAME) { new_object.transform.location.y = 0.0; result.meshes[0].position.y = 0.0; }
            manifest.add(new_object);

            io.to(room).emit('load-mesh', new_object.name, new_object);
            console.log('mesh streamed ' + new_object.name);
        });

        socket.on('client-load-mesh', async (filename) => {
            const new_object = new Object(player);
            new_object.name = filename;
            new_object.transform = new Transform(new Vector(0.0, defaultHeight, 0.0), new Vector(0, 0, 0), new Vector(1.0, 1.0, 1.0));
            new_object.meshUrl = `assets/${filename}`;

            const result = await BABYLON.SceneLoader.ImportMeshAsync('', SCENE_ROOT, `asstets/${filename}`, scene, null, '.babylon');
            buildLods(result.meshes, scene);
            for(let i in result.meshes) {
                new_object.lodNames.push(result.meshes[i].name);
            }
            if(result.meshes[0].name == TERRAIN_NAME) { new_object.transform.location.y = 0.0; result.meshes[0].position.y = 0.0; }
            manifest.add(new_object);

            io.to(room).emit('load-mesh', new_object.name, new_object);
            console.log('mesh loaded ' + new_object.name);
        });

        socket.on('client-remove-mesh', (name) => {
            io.to(room).emit('remove-mesh', name);
            manifest.update_single(name, undefined, scene, player);
            console.log('removed mesh ' + name);
        });

        socket.on('client-move-mesh', (name, transform) => {
            socket.to(room).emit('move-mesh', name, transform);
            manifest.update_single_move(name, transform, scene);
            console.log('mesh moved ' + name);
        });

        socket.on('disconnect', (reason) => {
            console.error('client disconnected:', reason);
          });
    
    });
}

function removeMesh(scene, mesh) {
    scene.removeMesh(mesh);
}

export function moveMeshTo(scene, mesh, end) {
    let _start = new BABYLON.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
    let _end = new BABYLON.Vector3(end.x, end.y, end.z);
    if(!_start.equalsWithEpsilon(_end, 0.2)) {
        const lenght = BABYLON.Vector3.Distance(_start, _end);
        const locationAnimation = new LocationAnimation();
        const time = Math.pow(locationAnimation.time*lenght, 1/2); //time per 1 lenght units //aka speed
        locationAnimation.animation.setKeys( [{frame: 0, value: _start}, {frame: 60, value: _end}])
        
        mesh.animations[0] = locationAnimation.animation;
        scene.beginAnimation(mesh, 0, 60, false, 1/time);
    }
}

export function runRenderLoop(engine, scene) {
    engine.runRenderLoop(function() {
        scene.render();
    })
}