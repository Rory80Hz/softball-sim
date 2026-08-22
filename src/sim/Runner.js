import * as THREE from 'three';
import { toWorld } from '../field/Field.js';

export class Runner {
    constructor(scene, player) {
        this.player = player;
        this.active = true;
        this.currentBase = null; // null = home plate (batter), 'first', 'second', 'third'

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0x3333ff })
        );
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        this.pos = { x: 0, y: 0 };
        this.targetPos = null;
        this.path = []; // list of points to run to
        this.speed = 10 + (this.player.attributes.speed / 100) * 10;
    }

    setPosition(x, y) {
        this.pos = { x, y };
        this.targetPos = null;
        this.path = [];
        this.updateMesh();
    }

    runPath(points) {
        this.path = points;
        if(this.path.length > 0) {
            this.targetPos = this.path.shift();
        }
    }

    update(dt) {
        if (!this.active || !this.targetPos) return;

        const dx = this.targetPos.x - this.pos.x;
        const dy = this.targetPos.y - this.pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.5) {
            this.pos.x = this.targetPos.x;
            this.pos.y = this.targetPos.y;
            
            if (this.path.length > 0) {
                this.targetPos = this.path.shift();
            } else {
                this.targetPos = null; // Reached end of current path
            }
        } else {
            const step = Math.min(this.speed * dt, dist);
            this.pos.x += (dx / dist) * step;
            this.pos.y += (dy / dist) * step;
        }
        
        this.updateMesh();
    }

    updateMesh() {
        const worldPos = toWorld(this.pos.x, this.pos.y);
        this.mesh.position.set(worldPos.x, 4, worldPos.z);
    }
}
