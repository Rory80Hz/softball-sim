import * as THREE from 'three';
import { toWorld } from '../field/Field.js';

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

    setPosition(x, y) {
        this.pos = { x, y };
        this.targetPos = null;
        this.updateMesh();
    }

    moveTo(x, y, canMoveWithBall = false) {
        if (this.hasBall && !canMoveWithBall) return;
        this.canMoveWithBall = canMoveWithBall;
        this.targetPos = { x, y };
    }

    setInactive() {
        this.active = false;
        this.mesh.material.color.setHex(0xaaaaaa);
    }

    update(dt) {
        if (!this.active || (this.hasBall && !this.canMoveWithBall) || !this.targetPos) return;

        const dx = this.targetPos.x - this.pos.x;
        const dy = this.targetPos.y - this.pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.5) {
            this.pos.x = this.targetPos.x;
            this.pos.y = this.targetPos.y;
            this.targetPos = null;
        } else {
            const step = Math.min(this.moveSpeed * dt, dist);
            this.pos.x += (dx / dist) * step;
            this.pos.y += (dy / dist) * step;
        }
        
        this.updateMesh();
    }

    updateMesh() {
        const worldPos = toWorld(this.pos.x, this.pos.y);
        this.mesh.position.set(worldPos.x, 4, worldPos.z);
        this.label.position.set(worldPos.x, 9, worldPos.z);
    }
}
