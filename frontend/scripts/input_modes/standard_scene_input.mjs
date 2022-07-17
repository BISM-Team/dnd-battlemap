import { toggleShowFps, toggleShowDebug } from '../scene.mjs'
import { Vector, Transform, TERRAIN_NAME, CAMERA_NAME, defaultHeight } from '../shared.mjs'
import { manifest, onPickObj, onStartMoveObj, onUnpickObj, active_layer } from '../controller.mjs'

export class StandardSceneInput {
    enabled=false;
    canvas;

    pickedObj;
    tmpPickedObj;
    moving;
    moved;

    pickHeight = 0.5;
    rotationChange = Math.PI/2;
    scaleChange = 0.05;

    delKeyBind = 'Delete';
    showFpsKeyBind = 'f';
    showDebugKeyBind = 'B';
    rotateRightKeyBind = 'r';
    rotateLeftKeyBind = 'R';
    scaleKeyBind = 's';
    unscaleKeyBind = 'S';

    constructor() {
        this.enable = this.enable.bind(this);
        this.disable = this.disable.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.canPick = this.canPick.bind(this);
        this.canHit = this.canHit.bind(this);
        this.rotateRightObject = this.rotateRightObject.bind(this);
        this.rotateLeftObject = this.rotateLeftObject.bind(this);
        this.scaleUpObject = this.scaleUpObject.bind(this);
        this.scaleDownObject = this.scaleDownObject.bind(this);
        this.changeActiveLayer = this.changeActiveLayer.bind(this);
    }

    enable() {
        this.pickedObj = null;
        this.tmpPickedObj = null;
        this.moving = false;
        this.moved = false;

        manifest._scene.onPointerDown = this.onPointerDown;
        manifest._scene.onPointerMove = this.onPointerMove;
        manifest._scene.onPointerUp   = this.onPointerUp;

        this.canvas = document.getElementById("renderCanvas");
        this.canvas.addEventListener('keydown', this.onKeyDown);

        this.enabled = true;
    }

    disable() {
        if(this.pickedObj) onUnpickObj(this.pickedObj);
        this.pickedObj = null;
        this.tmpPickedObj = null;
        this.moving = false;
        this.moved = false;

        manifest._scene.onPointerUp   = () => {};
        manifest._scene.onPointerMove = () => {};
        manifest._scene.onPointerDown = () => {};

        this.canvas.removeEventListener('keydown', this.onKeyDown);
        const camera = manifest._scene.getCameraByName(CAMERA_NAME);
        camera.attachControl(this.canvas);
        this.canvas = null;

        this.enabled = false;
    }
    
    onPointerDown(evt, pickResult) {
        if(evt.button == 2) return;

        const pick = manifest._scene.pickWithRay(pickResult.ray, this.canPick);
        if (pick.hit) {
            const picked = manifest.getObjectFromLod(pick.pickedMesh.name);
            if(this.pickedObj && this.pickedObj != manifest.getObjectFromLod(TERRAIN_NAME)) {
                this.tmpPickedObj = picked;
            } else {
                this.tmpPickedObj = null; 
                this.pickedObj = picked;
                onPickObj(this.pickedObj);
            }
            if (this.pickedObj != manifest.getObjectFromLod(TERRAIN_NAME)) {
                this.moving = true;
                this.moved = false;
                const camera = manifest._scene.getCameraByName(CAMERA_NAME);
                camera.detachControl(this.canvas);
            }
        }
        else {
            if(this.pickedObj) onUnpickObj(this.pickedObj);
            this.moving = false;
            this.moved = false;
            this.tmpPickedObj = null;
            this.pickedObj = null;
        }
    }

    onPointerMove(evt, pickResult) {
        if(this.moving) {
            const pick = manifest._scene.pickWithRay(pickResult.ray, this.canHit);
            if(pick.pickedMesh) {
                if(!this.moved) onStartMoveObj(this.pickedObj);
                this.moved = true;
                pick.pickedPoint._y += this.pickHeight;
                manifest._scene.getMeshByName(this.pickedObj.lodNames[0]).position = new BABYLON.Vector3(pick.pickedPoint._x, pick.pickedPoint._y, pick.pickedPoint._z);
            }
        }
    }

    async onPointerUp() {
        if(this.tmpPickedObj && !this.moved) {
            onUnpickObj(this.pickedObj);
            this.pickedObj = this.tmpPickedObj;
            this.tmpPickedObj = null;
            onPickObj(this.pickedObj);
            if (this.pickedObj != manifest.getObjectFromLod(TERRAIN_NAME)) {
                this.moving = true;
                this.moved = false;
                const camera = manifest._scene.getCameraByName(CAMERA_NAME);
                camera.detachControl(this.canvas);
            }
        }
        if(this.pickedObj && this.moved) {
            if (this.pickedObj != manifest.getObjectFromLod(TERRAIN_NAME)) {
                const root_mesh = manifest._scene.getMeshByName(this.pickedObj.lodNames[0]);
                const vec = root_mesh.position;
                const endPos = new Vector(vec._x, vec._y-this.pickHeight, vec._z);
                endPos.y = endPos.y > defaultHeight ? endPos.y : defaultHeight;
                root_mesh.position = new BABYLON.Vector3(endPos.x, endPos.y, endPos.z);
                const transform = this.pickedObj.transform;
                const new_transform = new Transform(    endPos,
                                                        new Vector(transform.rotation.x, transform.rotation.y, transform.rotation.z), 
                                                        new Vector(transform.scaling.x, transform.scaling.y, transform.scaling.z));
                this.pickedObj.transform = new_transform;
                await manifest.update(this.pickedObj);
            }
            const camera = manifest._scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(this.canvas, true);
            onUnpickObj(this.pickedObj);
            this.tmpPickedObj = null;
            this.pickedObj = null;
        }
        else if(this.moving) {
            const camera = manifest._scene.getCameraByName(CAMERA_NAME);
            camera.attachControl(this.canvas, true);
        }
        this.moving = false;
        this.moved = false;
    }

    async onKeyDown(e) {
        switch(e.key) {
            case this.delKeyBind:
                if(this.pickedObj) {
                    onUnpickObj(this.pickedObj);
                    manifest.remove(this.pickedObj.name);
                    this.tmpPickedObj = null;
                    this.pickedObj = null;
                    this.moving = false;
                    this.moved = false;
                }
                break;

            case this.showFpsKeyBind:
                toggleShowFps();
                break;

            case this.showDebugKeyBind:
                toggleShowDebug(manifest._scene);
                break;
                
            case this.rotateRightKeyBind:
                if(this.pickedObj)
                    await this.rotateRightObject(this.pickedObj);
                break;

            case this.rotateLeftKeyBind:
                if(this.pickedObj)
                    await this.rotateLeftObject(this.pickedObj);
                break;
            
            case this.scaleKeyBind:
                if(this.pickedObj)
                    await this.scaleUpObject(this.pickedObj);
                break;

            case this.unscaleKeyBind:
                if(this.pickedObj)
                    await this.scaleDownObject(this.pickedObj);
                break;

            default:
                break;
        }
    }

    canPick(mesh) {
        let object;
        return mesh.isPickable && (object=manifest.getObjectFromLod(mesh.name)) && (object.layer == active_layer || active_layer == -1); // can only pick objects from active layer
    }
    
    canHit(mesh) {
        let object;
        return mesh.isPickable && (object=manifest.getObjectFromLod(mesh.name)) && object!=this.pickedObj && object.layer < active_layer; // picked objects can only interact with lower layers
    }

    async rotateRightObject(obj) {
        let transform = obj.transform;
        const new_transform = new Transform(    new Vector(transform.location.x, transform.location.y, transform.location.z),   
                                                new Vector(transform.rotation.x, transform.rotation.y+this.rotationChange, transform.rotation.z), 
                                                new Vector(transform.scaling.x, transform.scaling.y, transform.scaling.z));
        obj.transform = new_transform;
        await manifest.update(obj);
    }

    async rotateLeftObject(obj) {
        let transform = obj.transform;
        const new_transform = new Transform(    new Vector(transform.location.x, transform.location.y, transform.location.z),   
                                                new Vector(transform.rotation.x, transform.rotation.y-this.rotationChange, transform.rotation.z), 
                                                new Vector(transform.scaling.x, transform.scaling.y, transform.scaling.z));
        obj.transform = new_transform;
        await manifest.update(obj);
    }
    
    async scaleUpObject(obj) {
        let transform = obj.transform;
        const new_transform = new Transform(    new Vector(transform.location.x, transform.location.y, transform.location.z),   
                                                new Vector(transform.rotation.x, transform.rotation.y, transform.rotation.z), 
                                                new Vector(transform.scaling.x+this.scaleChange, transform.scaling.y+this.scaleChange, transform.scaling.z+this.scaleChange));
        obj.transform = new_transform;
        await manifest.update(obj);
    }
    
    async scaleDownObject(obj) {
        let transform = obj.transform;
        const new_transform = new Transform(    new Vector(transform.location.x, transform.location.y, transform.location.z),   
                                                new Vector(transform.rotation.x, transform.rotation.y, transform.rotation.z), 
                                                new Vector(transform.scaling.x-this.scaleChange, transform.scaling.y-this.scaleChange, transform.scaling.z-this.scaleChange));
        obj.transform = new_transform;
        await manifest.update(obj);
    }
    
    async changeActiveLayer(l) {
        if(this.pickedObj && l>=0) {
            this.pickedObj.layer = l;
            await manifest.update(this.pickedObj);
        }
    }
}