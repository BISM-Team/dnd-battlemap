import { resetScene as _resetScene, initScene, highlightMesh, unHighlightMesh } from './scene.mjs';
import { Player, SceneManifest } from './manifest.mjs'
import { addSceneBindings } from './input.mjs'
import { TERRAIN_NAME } from './shared.mjs'
import { addOptionsPanel, removeOptionsPanel } from './ui.mjs';

export let manifest;
export let player;
export let players = []; // Players

export function setPlayer(name) {
    player = new Player(name);
}

export function setPlayerList(_players) {
    players = _players;
}

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
    addOptionsPanel(mesh);
}

export function onStartMoveMesh(mesh) {
    if(mesh == manifest._scene.getMeshByName(TERRAIN_NAME)) return;
    removeOptionsPanel();
}

export function onUnpickMesh(mesh) {
    if(mesh == manifest._scene.getMeshByName(TERRAIN_NAME)) return;
    manifest.getAllMeshesFromLod(mesh.name).forEach(mesh => {
        unHighlightMesh(mesh);
    });
    removeOptionsPanel();
}