import { player } from "./controller.mjs";
import { createLine, moveMeshTo, removeMesh, rotateMeshTo, scaleMeshTo, Transform, Vector } from "./shared.mjs";

export class Player {
    name = '';
    constructor (name) { this.name = name; }
}

export class LodObject {
    type = "LodObject";
    name;
    transform;
    meshUrl;
    lodNames = []; // String
    layer;
    owners;
    visibility;

    constructor(name, transform = null, meshUrl = '', layer = 0, owners = [], visibility = {visibleToAll: true, viewers: []}) {
        this.name = name;
        this.meshUrl = meshUrl;
        this.transform = transform ? transform : new Transform(new Vector(0, 0, 0), new Vector(0, 0, 0), new Vector(0, 0, 0));
        this.layer = layer;
        this.owners = owners;
        this.visibility = visibility;
    }

    async set_mesh_url(meshUrl, manifest) {
        this.meshUrl = meshUrl;
        if(manifest._scene) {
            result = await addMeshFromUrl(manifest._scene, this.meshUrl, this.lodNames);
            if(this.transform.isEqual(new Transform(new Vector(0, 0, 0), new Vector(0, 0, 0), new Vector(0, 0, 0)))) {
                this.set_transform(   new Transform(new Vector(0.0, defaultHeight, 0.0), 
                                                    new Vector(result.meshes[0].rotation._x, result.meshes[0].rotation._y, result.meshes[0].rotation._z), 
                                                    new Vector(result.meshes[0].scaling._x, result.meshes[0].scaling._y, result.meshes[0].scaling._z)));
            }
        }
    }

    set_transform(new_transform, manifest) {
        this.transform = new_transform;
        if(manifest._scene) {
            const mesh = manifest._scene.getMeshByName(this.lodNames[0]);
            moveMeshTo(manifest._scene, mesh, this.transform.location);
            rotateMeshTo(manifest._scene, mesh, this.transform.rotation);
            scaleMeshTo(manifest._scene, mesh, this.transform.scaling);
        }
    }

    set_visibility(v, manifest) {
        this.visibility = v;
        if(manifest._scene) {
            if(this.visibleToAll || this.viewers.find(viewer => { return viewer.name == manifest.player.name; })) {
                this.lodNames.forEach(name => { manifest._scene.getMeshByName(name).setEnabled(true); })
            } else {
                this.lodNames.forEach(name => { manifest._scene.getMeshByName(name).setEnabled(false); })
            }
        }
    }

    async update(obj, manifest) {
        await this.set_mesh_url(obj.meshUrl, manifest);
        this.set_transform(obj.transform, manifest);
        this.layer = obj.layer;
        this.owners = obj.owners;
        set_visibility(obj.visibility, manifest);
    }

    destroy(manifest) {
        if(manifest._scene) this.lodNames.forEach((_name) => { removeMesh(manifest._scene, manifest._scene.getMeshByName(_name)); });
    }

    fix_protos() {
        this.transform.__proto__ = Transform.prototype; this.transform.fix_protos();
        this.viewers.forEach((viewer) => { if(viewer) viewer.__proto__ = Player.prototype; });
        this.owners.forEach((owner) => { if(owner) owner.__proto__ = Player.prototype; });
    }
}

export class LineObject {
    type = "LineObject";
    name; // owner.name
    start = new Vector(0, 0, 0);
    end = new Vector(0, 0, 0);
    visibleToAll = true;
    viewers = []; // Player

    constructor(name, start = null, end = null, layer = 0, visibility = {visibleToAll: true, viewers: []}) {
        this.name = name;
        this.start = start ? start : new Vector(0, 0, 0);
        this.end = end ? end : new Vector(0, 0, 0);
        this.layer = layer;
        this.visibility = visibility;
    }

    set_start_end(start, end, manifest) {
        this.start = start;
        this.end = end;
        if(manifest._scene) createLine(manifest._scene, this.start, this.end, this.name);
    }

    set_visibility(v, manifest) {
        this.visibility = v;
        if(manifest._scene) {
            const line_mesh = manifest._scene.getMeshByName(this.name);
            if(this.visibleToAll || this.viewers.find(viewer => { return viewer.name == manifest.player.name; })) {
                line_mesh.setEnabled(true);
            } else {
                line_mesh.setEnabled(false);
            }
        }
    }

    async update(obj, manifest) {
        this.set_start_end(obj.start, obj.end, manifest);
        this.layer = obj.layer;
        set_visibility(obj.visibility, manifest);
    }

    destroy(manifest) {
        if(manifest._scene) removeMesh(manifest._scene, manifest._scene.getMeshByName(this.name));
    }

    fix_protos() {
        this.start.__proto__ = Vector.prototype;
        this.end.__proto__ = Vector.prototype;
        this.viewers.forEach((viewer) => { if(viewer) viewer.__proto__ = Player.prototype; });
    }
}

export class ObjectType {
    static desc_to_type = { "LodObject": LodObject, "LineObject": LineObject };
}

export class Manifest {
    player;
    connection;
    _scene;
    scene = [];
    loading = 0;

    constructor(player, connection, _scene=null) {
        this.player = player;
        this.connection = connection;
        this._scene = _scene;
    }

    request_update(obj) {
        connection.sendUpdateObject(obj.name, obj);
    }

    async update(obj, replicate=true) {
        object = this.find(obj.name);
        if(!object) {
            object = new ObjectType.desc_to_type[obj.type](obj.name);
            this.add(object);
        }
        await object.update(obj, this);
        if(replicate) connection.sendUpdateObject(obj.name, obj);
    }

    remove(name, replicate=true) {
        const index = this.findIndex(name); 
        if(index != -1) { 
            this.find(obj.name).destroy(this);
            this.scene.splice(index, 1);
            if(replicate) connection.sendRemoveObject(name);
        }
        else console.error(name + ' not found'); 
    }

    update_all(new_manifest) {
        const __scene = this.scene.concat(new_manifest.scene);
        await Promise.all(__scene.map( async object => { 
            if(object) { 
                if(this.find(object.name) && !new_manifest.find(object.name))
                    { this.remove(object.name, false); return; }
                await this.update(new_manifest.find(object.name), false); 
            } 
        }));
    }

    add(obj) {
        const index = this.findIndex(obj.name); 
        if(index == -1) { this.scene.push(obj); } 
        else console.error(obj.name + ' already present'); 
    }

    find(name) { return this.scene.find( object => {return object && object.name == name;}); }
    findIndex(name) { return this.scene.findIndex( object => {return object && object.name == name;}); }
    to_string() { let s=''; this.scene.forEach( obj => { s+=(obj.name + '; '); }); return s; }

    fix_protos() {
        this.scene.forEach( object => { if(object) { object.__proto__ = ObjectType.desc_to_type[obj.type].prototype; object.fix_protos(); }});
    }

}