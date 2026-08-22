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
        this.mode = 'idle';
        this.hasLanded = false;
        this.carrier = null;
        this.onThrowComplete = null;
        this.onDead = null;
    }

    hit(targetX, targetY, hitType = 'grounder', batterStats = null) {
        this.mode = 'hit';
        this.carrier = null;
        this.hasLanded = hitType === 'grounder';
        this.pos = { x: 0, y: 0, z: 3 }; // stat 3 ft high (contact point)
        
        const contact = Number(batterStats?.battingContact) || 55;
        const power = Number(batterStats?.battingPower) || 55;
        const variance = ((100 - contact) / 100) * 25;
        
        const finalX = targetX + (Math.random() * variance * 2 - variance);
        const finalY = targetY + (Math.random() * variance * 2 - variance);
        
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
                speed = 75 + (power / 100) * 55 + (Math.random() * 16 - 8);
                t = dist / speed;
                break;
            case 'grounder':
            default:
                speed = 45 + (power / 100) * 45 + (Math.random() * 12 - 6);
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

    throwTo(start, target, speed, accuracy = 100, maxDistance = Infinity, arcHeight = 7) {
        const dx = target.x - start.x;
        const dy = target.y - start.y;
        const distance = Math.hypot(dx, dy);
        const error = (100 - accuracy) / 100 * 8;
        const requestedTarget = {
            x: target.x + (Math.random() * 2 - 1) * error,
            y: target.y + (Math.random() * 2 - 1) * error,
        };
        const requestedDx = requestedTarget.x - start.x;
        const requestedDy = requestedTarget.y - start.y;
        const requestedDistance = Math.hypot(requestedDx, requestedDy);
        const throwDistance = Math.min(requestedDistance, maxDistance);
        const finalTarget = {
            x: start.x + (requestedDx / (requestedDistance || 1)) * throwDistance,
            y: start.y + (requestedDy / (requestedDistance || 1)) * throwDistance,
        };
        const finalDx = finalTarget.x - start.x;
        const finalDy = finalTarget.y - start.y;
        const finalDistance = Math.hypot(finalDx, finalDy) || 1;

        const gravity = 32.2;
        const minimumFlightTime = 2 * Math.sqrt((2 * arcHeight) / gravity);
        const flightTime = Math.max(finalDistance / Math.max(speed, 1), minimumFlightTime);
        const horizontalSpeed = finalDistance / flightTime;

        this.pos = { x: start.x, y: start.y, z: 4 };
        this.velocity = {
            x: (finalDx / finalDistance) * horizontalSpeed,
            y: (finalDy / finalDistance) * horizontalSpeed,
            z: gravity * flightTime / 2,
        };
        this.throwTarget = finalTarget;
        this.throwStart = { x: start.x, y: start.y };
        this.throwRemaining = finalDistance;
        this.throwMissed = requestedDistance > maxDistance;
        this.mode = 'throw';
        this.carrier = null;
        this.active = true;
        this.mesh.visible = true;
        this.updateMesh();
    }

    setCarrier(fielder) {
        this.carrier = fielder;
        this.active = false;
        this.mode = 'held';
        this.pos = { ...fielder.pos, z: 4 };
        this.updateMesh();
    }

    releaseAt(position) {
        this.carrier = null;
        this.pos = { x: position.x, y: position.y, z: 0.5 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.mode = 'loose';
        this.active = true;
        this.mesh.visible = true;
        this.updateMesh();
    }

    update(dt) {
        if (!this.active) return;

        if (this.mode === 'throw') {
            const distance = Math.hypot(this.velocity.x, this.velocity.y) * dt;
            this.pos.x += this.velocity.x * dt;
            this.pos.y += this.velocity.y * dt;
            this.velocity.z -= 32.2 * dt;
            this.pos.z += this.velocity.z * dt;
            this.throwRemaining -= distance;
            if (this.throwRemaining <= 0) {
                this.pos.x = this.throwTarget.x;
                this.pos.y = this.throwTarget.y;
                this.pos.z = 4;
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.active = false;
                this.mode = 'idle';
                if (this.onThrowComplete) this.onThrowComplete(this.throwTarget);
            }
            this.updateMesh();
            return;
        }

        this.pos.x += this.velocity.x * dt;
        this.pos.y += this.velocity.y * dt;
        if (this.mode === 'loose' && this.onDead && this.onDead()) return;
        // Gravity
        if (this.pos.z > 0 || this.velocity.z > 0) {
            this.velocity.z += -32.2 * dt;
            this.pos.z += this.velocity.z * dt;
            
            if (this.pos.z <= 0) {
                this.pos.z = 0;
                this.velocity.z = 0; // stop bouncing for now, just roll
                this.hasLanded = true;
            }
        }
        
        // Ground Friction
        if (this.pos.z <= 0) {
            const friction = 35; // ft/s^2 deceleration
            const speed = Math.hypot(this.velocity.x, this.velocity.y);
            if (speed > 0) {
                const newSpeed = Math.max(0, speed - friction * dt);
                this.velocity.x = (this.velocity.x / speed) * newSpeed;
                this.velocity.y = (this.velocity.y / speed) * newSpeed;
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
