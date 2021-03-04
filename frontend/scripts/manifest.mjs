import {Vector, Transform} from './utils.mjs'

let moveMeshTo, removeMesh, addMeshFromUrl;

export function generateManifest(_moveMeshTo, _removeMesh, _addMeshFromUrl) {
    moveMeshTo = _moveMeshTo;
    removeMesh = _removeMesh;
    addMeshFromUrl = _addMeshFromUrl;
}
    
export class Player {
    constructor (name) { this.name = name; }
}

export class Object {
    name = '';
    transform = new Transform(  new Vector(0.0, 0.0, 0.0), 
                                new Vector(0.0, 0.0, 0.0), 
                                new Vector(0.0, 0.0, 0.0));
    meshUrl = '';
    lodNames = [];
    visibleToAll = true;
    viewers = []; //Player
    owners = []; //Player

    constructor (owner) {
        this.owners = [owner.name];
    }
    
    async update(new_object, scene, player, manifest) {
        if(new_object === undefined && manifest.find(this.name) !== undefined) { this.remove(scene, manifest, 1); return; }
        if(new_object !== undefined && manifest.find(this.name) === undefined) { await this.load(scene, manifest); }
        if(!new_object.transform.isEqual(this.transform)) this.move(scene, new_object.transform);
        this.show_hide(scene, new_object.viewers, player);
    }

    move(scene, transform) { 
        this.transform = transform; 
        const mesh = scene.getMeshByName(this.lodNames[0]);
        if(!mesh) { console.error(this.lodNames[0] + " not found"); return; }
        moveMeshTo(scene, mesh, transform.location); 
    }

    async load(scene, manifest) { 
        this.lodNames = [];
        manifest.add(this);
        await addMeshFromUrl(scene, this.meshUrl, this.lodNames);
        this.move(scene, this.transform);
    }

    remove(scene, manifest, counter) { 
        console.log(manifest.loading, counter);
        if(manifest.loading != counter) {
            console.log('set remove timeout');
            setTimeout(this.remove, 300, scene, manifest, 0);
            return;
        }
        this.lodNames.forEach((_name) => { removeMesh(scene, scene.getMeshByName(_name)); });
        manifest.remove(this.name);
    }

    show_hide(scene, viewers, player) { 
        const meshes = this.getLodMeshes(scene);
        this.viewers = viewers; 
        if(this.visibleToAll || this.viewers.find(viewer => { return viewer == player.name; })) {
            meshes.forEach(mesh => { mesh.setEnabled(true); })
        } else {
            meshes.forEach(mesh => { mesh.setEnabled(false); })
        }
        /* TODO show and hide lods (with animation?) */
    };

    getLodMeshes(scene) {
        let lods = [];
        this.lodNames.forEach((lod) => { lods.push(scene.getMeshByName(lod)); });
        return lods;
    }

    fix_protos() {
        this.transform.__proto__ = Transform.prototype; this.transform.fix_protos();
        this.viewers.forEach((viewer) => { if(viewer) viewer.__proto__ = Player.prototype; });
        this.owners.forEach((owner) => { if(owner) owner.__proto__ = Player.prototype; });
    }
}


export class SceneManifest {
    scene = [];
    loading = 0;
    constructor() {}

    update_single_move(name, transform, scene) {
        const obj = this.find(name);
        if(!obj) console.error('Manifest entry not found');
        else obj.move(scene, transform);
    }

    async update_single(name, new_object, scene, player) {
        this.loading++;
        try {
            let obj = undefined;
            if((obj = this.find(name)) !== undefined) {
                await obj.update(new_object, scene, player, this);
            } else if(new_object !== undefined) {
                await new_object.update(new_object, scene, player, this)
            } else {
                throw console.error('Object is undefined');
            }
        } catch(ex) {
            this.loading--;
            throw ex;
        }
        this.loading--;
    }

    async update_all(new_manifest, scene, player) {
        this.loading++;
        try {
            const _scene = this.scene.concat(new_manifest.scene);
                await Promise.all(_scene.map(async (object) => { 
                    if(object) { await object.update(new_manifest.find(object.name), scene, player, this); } 
                }));
        } catch(ex) {
            this.loading--;
            throw ex;
        }
        this.loading--;
    }

    add(object) { 
        let name = object.name;
        let original_name = object.name;
        object.name = "tmp";
        let index = 0;
        while (this.find(name)) {
            name = index + original_name;
            index++;
        }
        object.name = name;
        return this.scene.push(object); 
    }

    find(name) { return this.scene.find((object) => {return object && object.name == name;}); }
    findIndex(name) { return this.scene.findIndex((object) => {return object && object.name == name;}); }
    to_string() { let s=''; this.scene.forEach((obj) => { s+=(obj.name + '; '); }); return s; }

    remove(name) { 
        const index = this.findIndex(name); 
        if(index != -1) { return this.scene.splice(this.findIndex(name), 1); } 
        else console.error(name + ' not found'); 
    }

    getMeshNameFromLod(lodName) { 
        let _name;
        this.scene.forEach((object) => { 
            if(object && object.lodNames.find((name) => { return name && name==lodName; })) 
                _name = object.name; 
        });
        if(!_name) throw new Error('lod name not found');
        return _name;
    }

    getAllMeshesFromLod(lodName, scene) {
        return this.find(this.getMeshNameFromLod(lodName)).getLodMeshes(scene);
    }

    fix_protos() {
        this.scene.forEach((object) => { if(object) { object.__proto__ = Object.prototype; object.fix_protos(); }});
    }
}