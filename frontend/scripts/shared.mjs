export const TERRAIN_NAME = 'terrain';
export const CAMERA_NAME = 'arcCamera';
export const SUN_NAME = 'Sun';

export let defaultHeight = 0.6;

let h_layer;
let guiTex;

export function setSceneGuiAndHighlightLayers(_h_layer, _guiTex) { 
    if(h_layer) h_layer.dispose();
    if(guiTex) guiTex.dispose();
    h_layer = _h_layer;
    guiTex = _guiTex;
}

export class Vector {
    constructor (x, y, z) { this.x = x; this.y=y; this.z=z; }

    add(other) { return new Vector(this.x+other.x, this.y+other.y, this.z+other.z); }
    difference(other) { return new Vector(this.x-other.x, this.y-other.y, this.z-other.z); }
    length() { return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2)) }

    isEqual(other) { return this.x == other.x && this.y==other.y && this.z==other.z;}
    toBabylonVec() { return new BABYLON.Vector3(this.x, this.y, this.z); }
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
    animation = null;
    time = 0.0;
    constructor () {
        this.animation = new BABYLON.Animation('move', 'position', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = 0.1;
    }
};
export class RotationAnimation {
    animation = null;
    time = 0.0;
    constructor () {
        this.animation = new BABYLON.Animation('rotate', 'rotation', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = 0.5;
    }
};
export class ScalingAnimation {
    animation = null;
    time = 0.0;
    constructor () {
        this.animation = new BABYLON.Animation('scale', 'scaling', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = 1.0;
    }
}

export function getPbrDefaultMaterial(scene) {
    let mat = scene.getMaterialByName("PBRMat");
    if(!mat) {
        mat = new BABYLON.PBRMaterial("PBRMat", scene);
        mat.albedoColor = new BABYLON.Color3(0.65, 0.65, 0.65);
        mat.metallic = 0.0;
        mat.roughness = 0.5;
        mat.clearCoat.isEnabled = true;
    }
    return mat;
}

export function getPbrDefaultMaterialRed(scene, _new=false) {
    let mat = scene.getMaterialByName("PBRMatRed");
    if(!mat) {
        mat = new BABYLON.PBRMaterial("PBRMatRed", scene);
        mat.albedoColor = new BABYLON.Color3.Red();
        mat.metallic = 0.0;
        mat.roughness = 0.5;
        mat.clearCoat.isEnabled = true;
    }
    return mat;
}

export async function addMeshFromUrl(scene, url, lodNames) {
    let result = (await BABYLON.SceneLoader.ImportMeshAsync('', '', url, scene, null, '.babylon'));
    buildLods(sortMeshes(result.meshes), scene);
    for(let i in result.meshes) {
        if(!result.meshes[i].material) {
            result.meshes[i].material = getPbrDefaultMaterial(scene);
        } else if(result.meshes[i].material.subMaterials) {
            for(let m in result.meshes[i].material.subMaterials) {
                result.meshes[i].material.subMaterials[m].ambientColor = new BABYLON.Color3(1, 1, 1);
            }
        }
        result.meshes[i].renderingGroupId = 1;
        lodNames.push(result.meshes[i].name);
    }
    return result;
}

export function moveMeshTo(scene, mesh, target) {
    let dirty = mesh.position._x != undefined; 
    let start = new BABYLON.Vector3(dirty ? mesh.position._x : mesh.position.x, dirty ? mesh.position._y : mesh.position.y, dirty ? mesh.position._z : mesh.position.z);
    let end = new BABYLON.Vector3(target.x, target.y, target.z);
    if(!start.equalsWithEpsilon(end, 0.2)) {
        const length = BABYLON.Vector3.Distance(start, end);
        const locationAnimation = new LocationAnimation();
        const time = Math.pow(locationAnimation.time*length, 1/2); //time per 1 length units //aka speed
        locationAnimation.animation.setKeys( [{frame: 0, value: start}, {frame: 60, value: end}]);

        scene.beginDirectAnimation(mesh, [locationAnimation.animation], 0, 60, false, 1/time);
    }
}

export function rotateMeshTo(scene, mesh, target) {
    let dirty = mesh.rotation._x != undefined; 
    let start = new BABYLON.Vector3(dirty ? mesh.rotation._x : mesh.rotation.x, dirty ? mesh.rotation._y : mesh.rotation.y, dirty ? mesh.rotation._z : mesh.rotation.z);
    let end = new BABYLON.Vector3(target.x, target.y, target.z);
    if(!start.equalsWithEpsilon(end, 0.2)) {
        const rotationAnimation = new RotationAnimation();
        const time = rotationAnimation.time; //time per 1 length units //aka speed
        rotationAnimation.animation.setKeys( [{frame: 0, value: start}, {frame: 60, value: end}])
        
        scene.beginDirectAnimation(mesh, [rotationAnimation.animation], 0, 60, false, 1/time);
    }
}

export function scaleMeshTo(scene, mesh, target) {
    let dirty = mesh.scaling._x != undefined; 
    let start = new BABYLON.Vector3(dirty ? mesh.scaling._x : mesh.scaling.x, dirty ? mesh.scaling._y : mesh.scaling.y, dirty ? mesh.scaling._z : mesh.scaling.z);
    let end = new BABYLON.Vector3(target.x, target.y, target.z);
    if(!start.equalsWithEpsilon(end, 0.01)) {
        const scalingAnimation = new ScalingAnimation();
        const time = scalingAnimation.time; //time per 1 length units //aka speed
        scalingAnimation.animation.setKeys( [{frame: 0, value: start}, {frame: 60, value: end}])
        
        scene.beginDirectAnimation(mesh, [scalingAnimation.animation], 0, 60, false, 1/time);
    }
}

export function createLine(scene, start, end, name, _options) {
    const subtracted = end.difference(start);
    const arrowHeadMaxSize = 0.6;
    const arrowRadius = 0.2;

    let cylinder;
    if(_options && _options.instance) {
        const end_vec = new BABYLON.Vector3(subtracted.length(), 0.0, 0.0);
        const abe_vec = new BABYLON.Vector3(subtracted.length()-(arrowHeadMaxSize*2.0), 0.0, 0.0);
        _options.path[2] = abe_vec;
        _options.path[3] = abe_vec;
        _options.path[4] = end_vec;
        cylinder = BABYLON.MeshBuilder.ExtrudeShapeCustom(null, _options, null);
    } else {
        let shape = [];
        let path = [];
        const subdivisions = 30;
        const deltaAngle = 2.0*Math.PI/subdivisions;
        for (let i=0; i<=subdivisions; i++) {
            shape.push(new BABYLON.Vector3(arrowRadius*Math.cos(i*deltaAngle), arrowRadius*Math.sin(i*deltaAngle), 0))
        }

        const zero = BABYLON.Vector3.Zero();
        const end_vec = new BABYLON.Vector3(subtracted.length(), 0.0, 0.0);
        const abe_vec = new BABYLON.Vector3(subtracted.length()-(arrowHeadMaxSize*2.0), 0.0, 0.0);
        path.push(zero);
        path.push(zero);
        path.push(abe_vec);
        path.push(abe_vec);
        path.push(end_vec);

        const scaling = (index, distance) => {
            switch (index) {
                case 0:
                    return 0;
                case 1: 
                    return 1;
                case 2: 
                    return 1;
                case 3:
                    return arrowHeadMaxSize / arrowRadius;
                case 4:
                    return 0;
            }
        };
        _options = { shape: shape, path: path, scaleFunction: scaling, updatable: true, sideOrientation: BABYLON.Mesh.DOUBLESIDE }
        cylinder = BABYLON.MeshBuilder.ExtrudeShapeCustom(name, _options, scene);
    }
    cylinder.material = getPbrDefaultMaterialRed(scene);
    cylinder.position = new BABYLON.Vector3(start.x, start.y, start.z);
    cylinder.rotation = new BABYLON.Vector3(0, Math.atan2(-subtracted.z/subtracted.length(), subtracted.x/subtracted.length()), Math.asin(subtracted.y/subtracted.length()));
    cylinder.renderingGroupId = 1;
    _options.instance = cylinder;
    return _options;
}

export function removeMesh(scene, mesh) {
    scene.removeMesh(mesh);
}

export function sortMeshes(meshes) {
    return meshes.sort((a, b) => { 
        if(a.name < b.name) return -1; 
        if(a.name > b.name) return 1;
        return 0; 
    });
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

export function removeGuiControl(name) {
    let control = guiTex.getControlByName(name);
    if(control) guiTex.removeControl(control);
}

export function addGuiLabelLinked(scene, name, text) {
    let mesh = scene.getMeshByName(name);
    let label = guiTex.getControlByName(name);
    if(!mesh) { console.error('Cannot find \"' + name + '\" mesh to link to'); };
    if(!label) {
        label = new BABYLON.GUI.TextBlock(name, text);
        label.fontSize = 20;
        label.color = "Red";
        label.linkOffsetY = -100;
        guiTex.addControl(label);
        label.linkWithMesh(mesh);
    } else {
        label.text = text;
    }
}

export function highlightMesh(mesh) {
    h_layer.addMesh(mesh, BABYLON.Color3.White());
}

export function unHighlightMesh(mesh) {
    h_layer.removeMesh(mesh);
}