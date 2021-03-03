const time_=0.1;

export class Vector {
    constructor (x, y, z) { this.x = x; this.y=y; this.z=z; }

    add(other) { return new Vector(this.x+other.x, this.y+other.y, this.z+other.z); }
    difference(other) { return new Vector(this.x-other.x, this.y-other.y, this.z-other.z); }
    lenght() { return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2)) }

    isEqual(other) { return this.x == other.x && this.y==other.y && this.z==other.z;}
}

export class Transform {
    constructor(location, rotation, scaling) {
        this.location = location;
        this.rotation = rotation;
        this.scaling = scaling;
    }

    isEqual(other) { return this.location.isEqual(other.location) && this.location.isEqual(other.rotation) && this.scaling.isEqual(other.scaling);}
    fix_protos() { this.location.__proto__ = Vector.prototype; this.rotation.__proto__ = Vector.prototype; this.scaling.__proto__ = Vector.prototype; }
}

export function generateManifest(moveMeshTo, removeMesh, addMeshFromUrl) {
    let objects = {};
    
    class Player {
        constructor (name) { this.name = name; }
    }
    objects.Player = Player;

    class Object {
        name = '';
        transform = new Transform(0.0, 0.0, 0.0);
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
    objects.Object = Object;

    
    class SceneManifest {
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
    objects.SceneManifest = SceneManifest;

    return objects;
}

export class LocationAnimation {
    constructor () {
        this.animation = new BABYLON.Animation('move', 'position', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = time_;
    }
};
export class RotationAnimation {
    constructor () {
        this.animation = new BABYLON.Animation('rotate', 'rotation', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = time_;
    }
};
export class ScalingAnimation {
    constructor () {
        this.animation = new BABYLON.Animation('scale', 'scaling', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = time_;
    }
}

export const TERRAIN_NAME = 'terrain';
export const CAMERA_NAME = 'arcCamera';
export const SUN_NAME = 'Sun';

export let defaultHeight = 0.6;