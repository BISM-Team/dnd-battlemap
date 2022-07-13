import { manifest, player, players, setPlayer, setPlayerList, resetScene } from './controller.mjs'
import { SceneManifest, Object, Player } from './manifest.mjs'
import { Transform } from './shared.mjs'

let socket;

/* Download */

export function connectToRoom(room, name) {
    if(socket) socket.disconnect(true);

    setPlayer(name);

    socket = io({
        transports: ['websocket'],
        autoConnect: false,
        query: {
            'room': room
        },
        auth: {
            'token': player.name
        }
    });
    socket.connect();

    socket.on('player-list', (_players) => {
        _players.forEach(_player => {
            if(_player) { _player.player.__proto__ = Player.prototype; }
        });
        setPlayerList(_players);
        console.log('player list updated ', players);
    })

    socket.on('load-scene', async (url, new_manifest) => {
        if(new_manifest) { new_manifest.__proto__ = SceneManifest.prototype; new_manifest.fix_protos(); }
        resetScene();
        await BABYLON.SceneLoader.AppendAsync('', url, manifest._scene);
        manifest.update_all(new_manifest, player);
        console.log('scene load client ' + url);
    });
    
    socket.on('load-mesh', async (name, object) => {
        if(object) { object.__proto__ = Object.prototype; object.fix_protos(); }
        manifest.update_single(name, object, player);
        console.log('client mesh loaded ' + name);
    });
    
    socket.on('remove-mesh', (name) => {
        manifest.update_single(name, undefined, player);
        console.log('client removed mesh ' + name);
    });
    
    socket.on('move-mesh', (name, transform) => {
        if(transform) { transform.__proto__ = Transform.prototype; transform.fix_protos(); }
        manifest.update_single_move(name, transform);
        console.log('client mesh moved ' + name);
    });

    socket.on('update-mesh', (name, new_obj) => {
        if(new_obj) { new_obj.__proto__ = Object.prototype; new_obj.fix_protos(); }
        manifest.update_single(name, new_obj, player);
        console.log('client mesh updated ' + name);
    });
    
    socket.on('connect', () => {
        console.log('connected to server')
    });
    
    socket.on('connect_error', (error) => {
        console.error('connection error: ', error);
    });
    
    socket.on('disconnect', (reason) => {
        console.error('disconnected from server:', reason);
    });
}

/* Upload */

export function localUploadMesh(file) {
    let reader = new FileReader();
    let str = "";
    reader.onload = function(event) { str += event.target.result; }
    reader.onloadend = function(event) { 
        const chunks = []; let i=0; const chunk_size = 1000000;
        while(str.length > chunk_size*i) {
            const start = chunk_size*i;
            chunks.push(str.slice(start, Math.min(start+chunk_size, str.length)));

            const req = new XMLHttpRequest();
            req.open('POST', `/assets/${file.name}?i=${i}&data=${true}`);
            req.onload = (ev => {
                console.log(file.name + ", " +  i + ", " + this.responseText);
            });
            req.setRequestHeader('Content-type', 'text/plain');
            req.send(`${chunks[i]}`);

            //socket.emit('client-stream-mesh-chunk', file.name, i, chunks[i]);
            ++i;
        }

        const req = new XMLHttpRequest();
        req.open('POST', `/assets/${file.name}?i=${i}&data=${false}`);
        req.send();

        //socket.emit('client-stream-mesh-last-chunk-index', file.name, i);
        console.log('stream-file ' + file.name);
    }
    reader.readAsText(file);
}

export function sendLoadMeshFromUrl(filename, layer) {
    socket.emit('client-load-mesh', filename, layer);
    console.log('send load mesh ' + filename);
}

export function sendMoveObjTo(obj_name, transform) {
    socket.emit('client-move-mesh', obj_name, transform);
    console.log('send move mesh ' + obj_name);
}

export function sendRemoveObject(obj_name) {
    socket.emit('client-remove-mesh', obj_name);
    console.log('send remove mesh ' + obj_name);
}

export function sendUpdateObject(obj_name, new_object) {
    socket.emit('client-update-mesh', obj_name, new_object);
    console.log('send update mesh' + obj_name);
}