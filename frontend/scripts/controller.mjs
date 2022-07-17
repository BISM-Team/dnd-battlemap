import { resetScene as _resetScene, initScene, highlightMesh, unHighlightMesh } from './scene.mjs';
import { addStandardSceneBindings, ui_standard_input } from './input.mjs'
import { Manifest, Player } from './manifest.mjs';
import { Connection } from './connection.mjs';

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
    manifest = new Manifest(player, new Connection(), scene);
    addStandardSceneBindings();
    initScene(scene);
}

export function onPickObj(obj) {
    obj.lodNames.forEach(name => {
        highlightMesh(manifest._scene.getMeshByName(name));
    });
    if(ui_standard_input.enabled) ui_standard_input.addOptionsPanel(obj);
}

export function onStartMoveObj(obj) {
    if(ui_standard_input.enabled) ui_standard_input.removeOptionsPanel();
}

export function onUnpickObj(obj) {
    obj.lodNames.forEach(name => {
        unHighlightMesh(manifest._scene.getMeshByName(name));
    });
    if(ui_standard_input.enabled) ui_standard_input.removeOptionsPanel();
}