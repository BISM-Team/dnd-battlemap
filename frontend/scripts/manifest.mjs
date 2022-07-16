import { Vector, Transform, moveMeshTo, rotateMeshTo, scaleMeshTo, removeMesh, addMeshFromUrl, defaultHeight, TERRAIN_NAME, createLine, removeLine } from './shared.mjs'

export class Player {
    name = '';
    constructor (name) { this.name = name; }
}

export class Object {
    name = '';
    transform = new Transform(  new Vector(0.0, 0.0, 0.0), 
                                new Vector(0.0, 0.0, 0.0), 
                                new Vector(0.0, 0.0, 0.0));
    meshUrl = '';
    lodNames = []; // String
    layer = 0;
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
        this.show_hide(scene, new_object.visibleToAll, new_object.viewers, player);
        this.update_other(new_object);
    }

    move(scene, transform) { 
        this.transform = transform;
        if(scene) {
            const mesh = scene.getMeshByName(this.lodNames[0]);
            if(!mesh) { console.error(this.lodNames[0] + " not found"); return; }
            moveMeshTo(scene, mesh, transform.location);
            rotateMeshTo(scene, mesh, transform.rotation);
            scaleMeshTo(scene, mesh, transform.scaling);
        }
    }

    async load(scene, manifest) { 
        this.lodNames = [];
        manifest.add(this);
        let result = null;
        if(scene) {
            result = await addMeshFromUrl(scene, this.meshUrl, this.lodNames);
            if(this.transform.isEqual(new Transform( new Vector(0.0, 0.0, 0.0), new Vector(0.0, 0.0, 0.0), new Vector(0.0, 0.0, 0.0)))) {
                this.transform = new Transform( new Vector(0.0, defaultHeight, 0.0), 
                                                new Vector(result.meshes[0].rotation._x, result.meshes[0].rotation._y, result.meshes[0].rotation._z), 
                                                new Vector(result.meshes[0].scaling._x, result.meshes[0].scaling._y, result.meshes[0].scaling._z));
                if(result.meshes[0].name == TERRAIN_NAME) { this.transform.location.y = 0.0; } // TODO send back to server ? maybe don't need to
            }
        }
        this.move(scene, this.transform);
    }

    remove(scene, manifest, counter) { 
        if(manifest.loading != counter) {
            console.log('set remove timeout');
            setTimeout(this.remove, 300, scene, manifest, 0);
            return;
        }
        if(scene) this.lodNames.forEach((_name) => { removeMesh(scene, scene.getMeshByName(_name)); });
        manifest.remove(this.name);
    }

    show_hide(scene, visibleToAll, viewers, player) { 
        this.visibleToAll = visibleToAll;
        this.viewers = viewers; 

        if(scene) {
            const meshes = this.getLodMeshes(scene);
            if(this.visibleToAll || this.viewers.find(viewer => { return viewer.name == player.name; })) {
                meshes.forEach(mesh => { mesh.setEnabled(true); })
            } else {
                meshes.forEach(mesh => { mesh.setEnabled(false); })
            }
        }
    };

    update_other(new_object) {
        this.layer = new_object.layer;
    }

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

export class Line {
    owner; //Player
    start = new Vector(0, 0, 0);
    end = new Vector(0, 0, 0);
    visibleToAll = true;
    viewers = []; //Player

    update(new_line, scene, player, manifest) {
        if(new_line === undefined && manifest.findLine(this.owner) !== undefined) { this.remove(scene, manifest, 1); return; }
        if(new_line !== undefined && manifest.findLine(this.owner) === undefined) { manifest.addLine(this); }
        this.create(scene, new_line.start, new_line.end, new_line.owner);
        this.show_hide(scene, new_line.visibleToAll, new_line.viewers, player);
    }

    create(scene, start, end, owner) {
        this.start = start;
        this.end = end;
        if(scene) createLine(scene, start, end, owner.name);
    }

    remove(scene, manifest, counter) {
        if(manifest.loading != counter) {
            console.log('set remove timeout');
            setTimeout(this.remove, 300, scene, manifest, 0);
            return;
        }
        if(scene) removeLine(scene, scene.getMeshByName(this.owner.name));
        manifest.removeLine(this.owner);
    }

    show_hide(scene, visibleToAll, viewers, player) { 
        this.visibleToAll = visibleToAll;
        this.viewers = viewers; 

        if(scene) {
            const line_mesh = scene.getMeshByName(this.owner.name);
            if(this.visibleToAll || this.viewers.find(viewer => { return viewer.name == player.name; })) {
                line_mesh.setEnabled(true);
            } else {
                line_mesh.setEnabled(false);
            }
        }
    };

    fix_protos() {
        this.start.__proto__ = Vector.prototype;
        this.end.__proto__ = Vector.prototype;
        this.owner.__proto__ = Player.prototype;
        this.viewers.forEach((viewer) => { if(viewer) viewer.__proto__ = Player.prototype; });
    }
}


export class SceneManifest {
    _scene = null;
    scene = [];
    lines = [];
    loading = 0;
    constructor(_scene) { this._scene = _scene; }

    update_single_move(name, transform) {
        const obj = this.find(name);
        if(!obj) console.error('Manifest entry not found');
        else obj.move(this._scene, transform);
    }

    async update_single(name, new_object, player) {
        this.loading++;
        try {
            let obj = undefined;
            if((obj = this.find(name)) !== undefined) {
                await obj.update(new_object, this._scene, player, this);
            } else if(new_object !== undefined) {
                await new_object.update(new_object, this._scene, player, this)
            } else {
                this.loading--;
                return console.error('Object is undefined');
            }
        } catch(ex) {
            this.loading--;
            throw ex;
        }
        this.loading--;
    }

    async update_all(new_manifest, player) {
        this.loading++;
        try {
            const __scene = this.scene.concat(new_manifest.scene);
            const __lines = this.lines.concat(new_manifest.lines);
            await Promise.all(__scene.map(async (object) => { 
                if(object) { await object.update(new_manifest.find(object.name), this._scene, player, this); } 
            }));
            __lines.forEach(line => { if(line) { line.update(new_manifest.findLine(line.owner), this._scene, player, this); }});
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

    updateLine(owner, new_line, player) {
        this.loading++;
        try {
            let line = undefined;
            if((line = this.findLine(owner)) !== undefined) {
                line.update(new_line, this._scene, player, this);
            } else if(new_line !== undefined) {
                new_line.update(new_line, this._scene, player, this)
            } else {
                this.loading--;
                return console.error('Line is undefined');
            }
        } catch(ex) {
            this.loading--;
            throw ex;
        }
        this.loading--;
    }
    
    addLine(line) {
        if(this.findLine(line.owner)) { console.error("line already present"); return; }
        return this.lines.push(line);
    }
    
    findLine(owner) { return this.lines.find( line => {return line.owner.name == owner.name;}); }
    findLineIndex(owner) { return this.lines.findIndex( line => {return line.owner.name == owner.name;}); }

    removeLine(owner) {
        const index = this.findLineIndex(owner); 
        if(index != -1) { return this.lines.splice(index, 1); } 
        else console.error('line belonging to ' + owner.name + ' not found'); 
    }

    find(name) { return this.scene.find((object) => {return object && object.name == name;}); }
    findIndex(name) { return this.scene.findIndex((object) => {return object && object.name == name;}); }
    to_string() { let s=''; this.scene.forEach((obj) => { s+=(obj.name + '; '); }); return s; }

    remove(name) { 
        const index = this.findIndex(name); 
        if(index != -1) { return this.scene.splice(index, 1); } 
        else console.error(name + ' not found'); 
    }

    getMeshNameFromLod(lodName) { 
        let _name = null;
        this.scene.forEach((object) => { 
            if(object && object.lodNames.find((name) => { return name && name==lodName; })) 
                _name = object.name; 
        });
        return _name;
    }

    getObjectFromLod(lodName) {
        let obj = null;
        this.scene.forEach((object) => { 
            if(object && object.lodNames.find((name) => { return name && name==lodName; })) {
                obj = object; 
            }
        });
        return obj;
    }

    getAllMeshesFromLod(lodName) {
        return this.find(this.getMeshNameFromLod(lodName)).getLodMeshes(this._scene);
    }

    fix_protos() {
        this.scene.forEach((object) => { if(object) { object.__proto__ = Object.prototype; object.fix_protos(); }});
        this.lines.forEach((line) => { if(line) { line.__proto__ = Line.prototype; line.fix_protos(); }});
    }
}