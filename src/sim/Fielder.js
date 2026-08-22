import * as THREE from 'three';
import { toWorld } from '../field/Field.js';

export class Fielder {
    constructor(scene, position, player) {
        this.positionName = position;
        this.player = player;
        this.active = true;
        
        // Use a simple box or cylinder for a player for now
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 16, 16), // roughly human sized
            new THREE.MeshStandardMaterial({ color: 0xff3333 })
        );
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        this.pos = { x: 0, y: 0 };
        this.targetPos = null;
        // Set speed from attributes, mapped to ft/s (e.g. 55 -> 15 ft/s)
        this.speed = 10 + (this.player.attributes.speed / 100) * 10; 
    }

    setPosition(x, y) {
        this.pos = { x, y };
        this.targetPos = null;
        this.updateMesh();
    }

    moveTo(x, y) {
        this.targetPos = { x, y };
    }

    setInactive() {
        this.active = false;
        this.mesh.material.color.setHex(0xaaaaaa);
    }

    update(dt) {
        if (!this.active || !this.targetPos) return;

        const dx = this.targetPos.x - this.pos.x;
        const dy = this.targetPos.y - this.pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.5) {
            this.pos.x = this.targetPos.x;
            this.pos.y = this.targetPos.y;
            this.targetPos = null;
        } else {
            const step = Math.min(this.speed * dt, dist);
            this.pos.x += (dx / dist) * step;
            this.pos.y += (dy / dist) * step;
        }
        
        this.updateMesh();
    }

    updateMesh() {
        const worldPos = toWorld(this.pos.x, this.pos.y);
        this.mesh.position.set(worldPos.x, 4, worldPos.z); // y=3 so it sits on ground
    }
}
