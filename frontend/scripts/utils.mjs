const time_=0.1;

export const TERRAIN_NAME = 'terrain';
export const CAMERA_NAME = 'arcCamera';
export const SUN_NAME = 'Sun';

export let defaultHeight = 0.6;

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

export function buildLods(meshes, scene) {
    let newMesh = meshes[0];

    let i=1;
    while (i<meshes.length) {
        newMesh.subMeshes[0].getRenderingMesh().addLODLevel(16*i, meshes[i].subMeshes[0].getRenderingMesh());
        meshes[i].subMeshes[0].getRenderingMesh().isVisible = true;
        i++;
    }

    i=0;
    while (i<meshes.length) {
        uniqueRename(meshes[i], scene);
        i++;
    }
}

export function uniqueRename(mesh, scene) {
    let name = mesh.name;
    const original_name = mesh.name;
    mesh.name = "tmp";
    let index = 0;
    while (scene.getMeshByName(name)) {
        name = index + original_name;
        index++;
    }
    mesh.name = name;
}