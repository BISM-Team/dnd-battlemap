import { resetScene as _resetScene, initScene, highlightMesh, unHighlightMesh } from './scene.mjs';
import { Player, SceneManifest } from './manifest.mjs'
import { addSceneBindings } from './input.mjs'
import { TERRAIN_NAME } from './utils.mjs'

export let manifest;
export const player = new Player('sas');

export function resetScene() {
    const scene = _resetScene(manifest ? manifest.scene : undefined);
    manifest = new SceneManifest(scene);
    addSceneBindings(scene);
    initScene(scene);
}

export function onPickMesh(mesh) {
    if(mesh == manifest._scene.getMeshByName(TERRAIN_NAME)) return;
    manifest.getAllMeshesFromLod(mesh.name).forEach(mesh => {
        highlightMesh(mesh);
    });
    // add options panel
}

export function onStartMoveMesh(mesh) {
    if(mesh == manifest._scene.getMeshByName(TERRAIN_NAME)) return;
    // remove options panel
}

export function onUnpickMesh(mesh) {
    if(mesh == manifest._scene.getMeshByName(TERRAIN_NAME)) return;
    manifest.getAllMeshesFromLod(mesh.name).forEach(mesh => {
        unHighlightMesh(mesh);
    });
    // remove options panel
}