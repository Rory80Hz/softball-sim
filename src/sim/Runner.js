import * as THREE from 'three';
import { toWorld } from '../field/Field.js';
import { BASES } from '../constants.js';

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
        this.lastSafePosition = { x: 0, y: 0 };
        this.passedBases = new Set();
        this.targetPos = null;
        this.path = []; // list of points to run to
        this.hasScored = false;
        this.isOut = false;
        this.onScore = null;
        this.onOut = null;
        this.speed = 10 + (this.player.attributes.speed / 100) * 10;
    }

    setPosition(x, y) {
        this.pos = { x, y };
        this.lastSafePosition = { x, y };
        this.currentBase = this.baseNameAtPosition(this.pos);
        this.targetPos = null;
        this.path = [];
        this.updateMesh();
    }

    runPath(points) {
        this.path = points.filter(Boolean);
        if(this.path.length > 0) {
            this.targetPos = this.path.shift();
        }
    }

    markOut() {
        if (this.isOut || this.hasScored) return;
        this.isOut = true;
        this.active = false;
        this.targetPos = null;
        this.path = [];
        this.mesh.material.color.setHex(0x777777);
        if (this.onOut) this.onOut(this);
    }

    update(dt) {
        if (!this.active || !this.targetPos) return;

        const dx = this.targetPos.x - this.pos.x;
        const dy = this.targetPos.y - this.pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.5) {
            this.pos.x = this.targetPos.x;
            this.pos.y = this.targetPos.y;
            const reachedBase = this.baseNameAtPosition(this.targetPos);
            const reachedHome = reachedBase === 'home';
            if (reachedBase) {
                this.currentBase = reachedBase;
                this.lastSafePosition = { x: this.pos.x, y: this.pos.y };
                this.passedBases.add(reachedBase);
            }
            
            if (this.path.length > 0) {
                this.targetPos = this.path.shift();
            } else {
                this.targetPos = null; // Reached end of current path
                if (reachedHome && !this.hasScored) {
                    this.hasScored = true;
                    if (this.onScore) this.onScore(this);
                }
            }
        } else {
            const step = Math.min(this.speed * dt, dist);
            this.pos.x += (dx / dist) * step;
            this.pos.y += (dy / dist) * step;
        }
        
        this.updateMesh();
    }


    returnToBase() {
        this.pos = { ...this.lastSafePosition };
        this.targetPos = null;
        this.path = [];
        this.updateMesh();
    }

    hasPassedBase(baseName) {
        return this.passedBases.has(baseName) || this.currentBase === baseName;
    }

    baseNameAtPosition(position) {
        return Object.keys(BASES).find(baseName => (
            BASES[baseName].x === position.x && BASES[baseName].y === position.y
        )) || null;
    }
    updateMesh() {
        const worldPos = toWorld(this.pos.x, this.pos.y);
        this.mesh.position.set(worldPos.x, 4, worldPos.z);
    }
}
