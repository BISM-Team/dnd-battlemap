import { resetScene as _resetScene, initScene, highlightMesh, unHighlightMesh } from './scene.mjs';
import { Player, SceneManifest } from './manifest.mjs'
import { addSceneBindings } from './input.mjs'
import { addOptionsPanel, removeOptionsPanel } from './ui.mjs';

export let manifest;
export let player;
export let players = []; // Players
export let active_layer = 1;

export function setPlayer(name) {
    player = new Player(name);
}

export function setPlayerList(_players) {
    players = _players;
}

export function setActiveLayer(l) {
    active_layer = l;
}

export function resetScene() {
    const scene = _resetScene(manifest ? manifest.scene : undefined);
    manifest = new SceneManifest(scene);
    addSceneBindings(scene);
    initScene(scene);
}

export function onPickMesh(mesh) {
    manifest.getAllMeshesFromLod(mesh.name).forEach(mesh => {
        highlightMesh(mesh);
    });
    addOptionsPanel(mesh);
}

export function onStartMoveMesh(mesh) {
    removeOptionsPanel();
}

export function onUnpickMesh(mesh) {
    manifest.getAllMeshesFromLod(mesh.name).forEach(mesh => {
        unHighlightMesh(mesh);
    });
    removeOptionsPanel();
}