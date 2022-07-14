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
    addSceneBindings();
    initScene(scene);
}

export function onPickObj(obj) {
    obj.lodNames.forEach(name => {
        highlightMesh(manifest._scene.getMeshByName(name));
    });
    addOptionsPanel(obj);
}

export function onStartMoveObj(obj) {
    removeOptionsPanel();
}

export function onUnpickObj(obj) {
    obj.lodNames.forEach(name => {
        unHighlightMesh(manifest._scene.getMeshByName(name));
    });
    removeOptionsPanel();
}