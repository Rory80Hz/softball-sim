const fs = require('fs');

const ballCode = `import * as THREE from 'three';
import { toWorld } from '../field/Field.js';

export class Ball {
    constructor(scene) {
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1.0, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x444400 })
        );
        this.mesh.visible = false;
        scene.add(this.mesh);
        
        this.pos = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.active = false;
    }

    hit(targetX, targetY, speed, type = 'grounder') {
        this.pos = { x: 0, y: 0, z: 3 }; // stat 3 ft high (contact point)
        const dx = targetX - this.pos.x;
        const dy = targetY - this.pos.y;
        const dist = Math.hypot(dx, dy);
        
        this.velocity.x = (dx / dist) * speed;
        this.velocity.y = (dy / dist) * speed;
        
        if (type === 'grounder') {
            this.pos.z = 0.5; // bounce/roll immediately
            this.velocity.z = 0;
        } else {
            // Find flight time to target
            const t = dist / speed;
            const g = -32.2; // gravity in ft/s^2
            // Solve for initial vertical velocity to land at z=0 at time t
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
`;
fs.writeFileSync('src/sim/Ball.js', ballCode);
