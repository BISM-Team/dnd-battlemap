import { resetScene as _resetScene, initScene } from './scene.mjs';
import { addStandardSceneBindings } from './input.mjs'
import { Manifest, Player } from './manifest.mjs';
import { Connection } from './connection.mjs';

export let manifest;
export let player;
export let players = []; // Players
export let active_layer = 2;
let connection;

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
    manifest = new Manifest(player, connection, scene);
    addStandardSceneBindings();
    initScene(scene);
}

export function connectToRoom(room, name) {
    connection = new Connection();
    connection.connectToRoom(room, name);
}