import * as THREE from 'three';
import { toWorld } from '../field/Field.js';
import { advanceToward } from './physics.js';

export class Fielder {
    constructor(scene, position, player) {
        this.positionName = position;
        this.player = player;
        this.active = true;
        this.hasBall = false;
        this.canMoveWithBall = false;
        this.isCaller = false;
        
        // Use a simple box or cylinder for a player for now
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 16, 16), // roughly human sized
            new THREE.MeshStandardMaterial({ color: 0xff3333 })
        );
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        const labelContext = labelCanvas.getContext('2d');
        labelContext.fillStyle = '#ffffff';
        labelContext.font = 'bold 34px sans-serif';
        labelContext.textAlign = 'center';
        labelContext.textBaseline = 'middle';
        labelContext.strokeStyle = '#111820';
        labelContext.lineWidth = 8;
        labelContext.strokeText(position, 64, 32);
        labelContext.fillText(position, 64, 32);
        this.label = new THREE.Sprite(new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(labelCanvas),
            transparent: true,
            depthTest: false,
        }));
        this.label.scale.set(9, 4.5, 1);
        scene.add(this.label);

        this.pos = { x: 0, y: 0 };
        this.targetPos = null;
        // Set speed from attributes, mapped to ft/s (e.g. 55 -> 15 ft/s)
        const speedAttribute = Number(this.player.attributes.speed) || 1;
        this.moveSpeed = 10 + (speedAttribute / 100) * 10;
    }

    get hasBall() {
        return this._hasBall;
    }

    // Losing the ball tints the fielder pale green so it's clear they held it earlier.
    set hasBall(value) {
        const had = this._hasBall;
        this._hasBall = Boolean(value);
        if (had && !this._hasBall && this.active) this.mesh.material.color.setHex(0x99cc66);
    }

    setPosition(x, y) {
        this.pos = { x, y };
        this.targetPos = null;
        this.updateMesh();
    }

    moveTo(x, y, canMoveWithBall = false) {
        if (this.hasBall && !canMoveWithBall) return;
        this.canMoveWithBall = canMoveWithBall;
        if (this.targetPos && Math.hypot(this.targetPos.x - x, this.targetPos.y - y) < 0.75) return;
        this.targetPos = { x, y };
    }

    setInactive() {
        this.active = false;
        this.mesh.material.color.setHex(0xaaaaaa);
    }

    update(dt) {
        if (!this.active || (this.hasBall && !this.canMoveWithBall) || !this.targetPos) {
            this.currentSpeed = 0;
            return;
        }

        if (advanceToward(this, this.targetPos, dt, this.moveSpeed)) {
            this.targetPos = null;
            this.currentSpeed = 0;
        }

        this.updateMesh();
    }

    updateMesh() {
        const worldPos = toWorld(this.pos.x, this.pos.y);
        this.mesh.position.set(worldPos.x, 4, worldPos.z);
        this.label.position.set(worldPos.x, 9, worldPos.z);
    }
}
