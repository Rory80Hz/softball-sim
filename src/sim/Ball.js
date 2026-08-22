import * as THREE from 'three';
import { toWorld } from '../field/Field.js';

export class Ball {
    constructor(scene) {
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1.0, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x444400 })
        );
        this.mesh.visible = false;
        this.mesh.castShadow = true;
        scene.add(this.mesh);
        
        this.pos = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.active = false;
    }

    hit(targetX, targetY, hitType = 'grounder', batterStats = null) {
        this.pos = { x: 0, y: 0, z: 3 }; // stat 3 ft high (contact point)
        
        // adding a bit of target randomization based on stats
        // If batter 'catchAccuracy' (using as general skill for now) is 55, variance is higher.
        const skill = batterStats?.catchAccuracy || 55;
        const variance = ((100 - skill) / 100) * 15; // Up to 15 ft random variance off target
        
        const finalX = targetX + (Math.random() * variance * 2 - variance);
        const finalY = targetY + (Math.random() * variance * 2 + variance / 2); // mostly varies further out
        
        const dx = finalX - this.pos.x;
        const dy = finalY - this.pos.y;
        const dist = Math.hypot(dx, dy);

        let t; // flight time
        let speed; // horizontal speed
        
        switch (hitType) {
            case 'pop_up':
                t = 4.0 + Math.random() * 2.0; // 4-6 seconds hang time (huge arc)
                speed = dist / t;
                break;
            case 'flyball':
                t = 3.5 + Math.random() * 1.5; // 3.5-5 seconds hang time
                speed = dist / t;
                break;
            case 'blooper':
                t = 2.5 + Math.random() * 1.0; // 2.5-3.5 seconds
                speed = dist / t;
                break;
            case 'line_drive':
                speed = 100 + Math.random() * 30; // Hard hit horizontally (100-130 ft/s)
                t = dist / speed;
                break;
            case 'grounder':
            default:
                speed = 70 + Math.random() * 30; // 70-100 ft/s
                t = dist / speed;
                break;

        }
        
        this.velocity.x = (dx / dist) * speed;
        this.velocity.y = (dy / dist) * speed;
        
        if (hitType === 'grounder') {
            this.pos.z = 0.5; // bounce/roll immediately
            this.velocity.z = 0;
        } else {
            const g = -32.2; // gravity in ft/s^2
            this.velocity.z = -(this.pos.z + 0.5 * g * t * t) / t;
        }
        
        this.active = true;
        this.mesh.visible = true;
        this.updateMesh();
    }

    update(dt) {
        if (!this.active) return;
        this.pos.x += this.velocity.x * dt;
        this.pos.y += this.velocity.y * dt;
        
        // Gravity
        if (this.pos.z > 0 || this.velocity.z > 0) {
            this.velocity.z += -32.2 * dt;
            this.pos.z += this.velocity.z * dt;
            
            if (this.pos.z <= 0) {
                this.pos.z = 0;
                this.velocity.z = 0; // stop bouncing for now, just roll
            }
        }
        
        this.updateMesh();
    }

    updateMesh() {
       const worldPos = toWorld(this.pos.x, this.pos.y);
       // Z is up in this visual mapping (y in threejs) 
       this.mesh.position.set(worldPos.x, worldPos.y + this.pos.z + 1.0, worldPos.z);
    }
}
