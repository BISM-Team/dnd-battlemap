import { manifest, player, players, setPlayer, setPlayerList, resetScene } from './controller.mjs'
import { Manifest, Player, ObjectType } from './manifest.mjs'

export class Connection {
    socket;

    sendUpdateObject(new_object, conn_params) {
        const dump_obj = false;
        this.socket.emit('client-update-object', new_object);
        console.log('send update object ' + (dump_obj ? JSON.stringify(new_object) : '\"' + new_object.name + '\"'));
    }

    sendRemoveObject(obj_name, conn_params) {
        this.socket.emit('client-remove-object', obj_name);
        console.log('send remove object \"' + obj_name + '\"');
    }

    connectToRoom(room, name) {
        if(this.socket) this.socket.disconnect(true);
    
        setPlayer(name);
    
        this.socket = io({
            transports: ['websocket'],
            autoConnect: false,
            query: {
                'room': room
            },
            auth: {
                'token': player.name
            }
        });
        this.socket.connect();
    
        this.socket.on('player-list', (_players) => {
            _players.forEach(_player => {
                if(_player) { _player.player.__proto__ = Player.prototype; }
            });
            setPlayerList(_players);
            console.log('player list updated ', players);
        })
    
        this.socket.on('load-scene', async (url, new_manifest) => {
            if(new_manifest) { new_manifest.__proto__ = Manifest.prototype; new_manifest.fix_protos(); }
            resetScene();
            await BABYLON.SceneLoader.AppendAsync('', url, manifest._scene);
            await manifest.update_all(new_manifest);
            console.log('scene load client ' + url);
        });
        
        this.socket.on('remove-object', (name) => {
            manifest.remove(name, false);
            console.log('client removed object ' + name);
        });
    
        this.socket.on('update-object', async new_obj => {
            ObjectType.fix_object_prototype(new_obj);
            await manifest.update(new_obj, false);
            console.log('client object updated ' + new_obj.name);
        });
        
        this.socket.on('connect', () => {
            console.log('connected to server')
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('connection error: ', error);
        });
        
        this.socket.on('disconnect', (reason) => {
            console.error('disconnected from server:', reason);
        });
    }
}

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

            ++i;
        }

        const req = new XMLHttpRequest();
        req.open('POST', `/assets/${file.name}?i=${i}&data=${false}`);
        req.send();

        console.log('stream-file ' + file.name);
    }
    reader.readAsText(file);
}