import { CAMERA_NAME, Vector } from '../shared.mjs'
import { active_layer, manifest, player } from '../controller.mjs'
import { sendCreateLine, sendRemoveLine } from '../connection.mjs';
import { Line } from '../manifest.mjs';

export class LineSceneInput {
    enabled=false;
    canvas;
    camera;
    
    lineHeight=0.5;

    moving;
    moved;
    startPos;
    lastPos;

    constructor() {
        this.enable = this.enable.bind(this);
        this.disable = this.disable.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.canHit = this.canHit.bind(this);
    }
    
    enable() {
        this.moving=false;
        this.moved=false;
        this.startPos=new Vector(0.0, 0.0, 0.0);
        this.lastPos=new Vector(0.0, 0.0, 0.0);

        this.canvas = document.getElementById("renderCanvas");
        this.camera = manifest._scene.getCameraByName(CAMERA_NAME);

        manifest._scene.onPointerDown = this.onPointerDown;
        manifest._scene.onPointerMove = this.onPointerMove;
        manifest._scene.onPointerUp   = this.onPointerUp;

        this.enabled=true;
    }

    disable() {
        manifest._scene.onPointerUp   = () => {};
        manifest._scene.onPointerMove = () => {};
        manifest._scene.onPointerDown = () => {};

        this.camera.attachControl(this.canvas, true);
        this.camera = null;
        this.canvas = null;

        this.moving=false;
        this.moved=false;
        this.startPos=new Vector(0.0, 0.0, 0.0);
        this.lastPos=new Vector(0.0, 0.0, 0.0);
        this.enabled=false;
    }

    onPointerDown(evt, pickResult) {
        if(evt.button == 2) return;

        const pick = manifest._scene.pickWithRay(pickResult.ray, this.canHit);
        if(pick.hit) {
            this.moving = true;
            this.startPos = new Vector(pick.pickedPoint._x, pick.pickedPoint._y+this.lineHeight, pick.pickedPoint._z);
            this.camera.detachControl(this.canvas);
        }

    }

    onPointerMove(evt, pickResult) {
        if(this.moving) {
            const pick = manifest._scene.pickWithRay(pickResult.ray, this.canHit);
            if(pick.hit) {
                this.moved = true;
                this.lastPos = new Vector(pick.pickedPoint._x, pick.pickedPoint._y+this.lineHeight, pick.pickedPoint._z);
                let line = new Line();
                line.owner = player;
                line.start = new Vector(this.startPos.x, this.startPos.y, this.startPos.z);
                line.end = new Vector(this.lastPos.x, this.lastPos.y, this.lastPos.z);
                manifest.updateLine(player, line, player);
                sendCreateLine(line);
            }
        }
    }

    onPointerUp(evt, pickResult) {
        if(evt.button == 2) return;

        if(this.moving && this.moved) {
            sendRemoveLine(player);
        }
        
        if(this.moving) this.camera.attachControl(this.canvas, true);

        this.moving=false;
        this.moved=false;
        this.startPos=new Vector(0.0, 0.0, 0.0);
        this.lastPos=new Vector(0.0, 0.0, 0.0);
    }
    
    canHit(mesh) {
        let object;
        return mesh.isPickable && (object=manifest.getObjectFromLod(mesh.name)) && object!=this.pickedObj && object.layer < active_layer; // picked objects can only interact with lower layers
    }
}