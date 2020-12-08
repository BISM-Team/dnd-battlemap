const time_=0.1;

export class LocationAnimation {
    animation;
    time;
    constructor () {
        this.animation = new BABYLON.Animation('move', 'position', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = time_;
    }
};
export class RotationAnimation {
    animation;
    time;
    constructor () {
        this.animation = new BABYLON.Animation('rotate', 'rotation', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = time_;
    }
};
export class ScalingAnimation {
    animation;
    time;
    constructor () {
        this.animation = new BABYLON.Animation('scale', 'scaling', 60, BABYLON.Animation.ANIMATIONTYPE_VECTOR3);
        this.animation.setEasingFunction(new BABYLON.BezierCurveEase(0.4, 0.0, 0.2, 1.0));
        this.time = time_;
    }
}

export const TERRAIN_NAME = 'terrain';
export const CAMERA_NAME = 'arcCamera';
export const SUN_NAME = 'Sun';

export var defaultHeight = 0.6;