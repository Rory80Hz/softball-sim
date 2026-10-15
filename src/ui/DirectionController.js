import * as THREE from 'three';
import { BASES } from '../constants.js';
import { toWorld } from '../field/Field.js';

const BASE_PICK_RADIUS = 10;
const CLICK_SLOP_PX = 5;

// While the engine is paused, lets the user click a fielder or runner and
// then click a target (ball / field spot / fielder / base) to direct them.
export class DirectionController {
    constructor(scene, engine, camera, domElement, container) {
        this.scene = scene;
        this.engine = engine;
        this.camera = camera;
        this.domElement = domElement;
        this.selected = null; // { kind: 'fielder' | 'runner', entity }
        this.raycaster = new THREE.Raycaster();
        this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.down = null;
        this.arrows = new Map();

        this.hint = document.createElement('div');
        this.hint.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);padding:6px 12px;background:rgba(17,24,32,.85);color:#fff;font:13px sans-serif;border-radius:6px;pointer-events:none;display:none;z-index:50;';
        container.style.position = container.style.position || 'relative';
        container.appendChild(this.hint);

        this._onDown = e => { this.down = { x: e.clientX, y: e.clientY }; };
        this._onUp = e => {
            if (!this.down) return;
            const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
            this.down = null;
            if (moved <= CLICK_SLOP_PX) this.handleClick(e);
        };
        domElement.addEventListener('pointerdown', this._onDown);
        domElement.addEventListener('pointerup', this._onUp);
    }

    // Destination of a manual order, in field coordinates, or null.
    orderTarget(kind, entity) {
        const { ball, pendingThrow } = this.engine;
        if (kind === 'fielder') {
            if (!entity.active || !entity.manualTarget) return null;
            if (entity.manualChase && ball.active) return ball.pos;
            if (pendingThrow?.playType === 'manual' && pendingThrow.fielder === entity) return pendingThrow.target;
            return entity.targetPos;
        }
        if (!entity.active || !entity.manual) return null;
        return entity.path?.length ? entity.path[entity.path.length - 1] : entity.targetPos;
    }

    // Draws an arrow from each manually directed player to where they were sent.
    update() {
        const live = new Set();
        const draw = (kind, entity) => {
            const target = this.orderTarget(kind, entity);
            if (!target) return;
            const from = toWorld(entity.pos.x, entity.pos.y, 1);
            const to = toWorld(target.x, target.y, 1);
            const dir = to.clone().sub(from);
            const length = dir.length();
            if (length < 2) return;
            let arrow = this.arrows.get(entity);
            if (!arrow) {
                const color = kind === 'fielder' ? 0xffdd00 : 0x00e5ff;
                arrow = new THREE.ArrowHelper(dir.clone().normalize(), from, length, color, 5, 3);
                arrow.line.material.depthTest = false;
                arrow.cone.material.depthTest = false;
                arrow.renderOrder = 10;
                this.scene.add(arrow);
                this.arrows.set(entity, arrow);
            }
            arrow.position.copy(from);
            arrow.setDirection(dir.normalize());
            arrow.setLength(length, Math.min(5, length), 3);
            live.add(entity);
        };
        this.engine.fielders.forEach(f => draw('fielder', f));
        this.engine.runners.forEach(r => draw('runner', r));
        for (const [entity, arrow] of this.arrows) {
            if (live.has(entity)) continue;
            this.scene.remove(arrow);
            arrow.dispose?.();
            this.arrows.delete(entity);
        }
    }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this._onDown);
        this.domElement.removeEventListener('pointerup', this._onUp);
        this.hint.remove();
    }

    handleClick(event) {
        if (this.engine.state !== 'paused') {
            this.clearSelection();
            return;
        }
        const rect = this.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(ndc, this.camera);
        this.resolveClick(this.pick(), this.groundPoint());
    }

    pick() {
        const { fielders, runners, ball } = this.engine;
        const candidates = [
            ...fielders.filter(f => f.active).map(entity => ({ kind: 'fielder', entity, mesh: entity.mesh })),
            ...runners.filter(r => r.active).map(entity => ({ kind: 'runner', entity, mesh: entity.mesh })),
        ];
        if (ball.mesh.visible && ball.active) candidates.push({ kind: 'ball', entity: ball, mesh: ball.mesh });
        const hits = this.raycaster.intersectObjects(candidates.map(c => c.mesh), false);
        return hits.length ? candidates.find(c => c.mesh === hits[0].object) : null;
    }

    groundPoint() {
        const hit = new THREE.Vector3();
        if (!this.raycaster.ray.intersectPlane(this.ground, hit)) return null;
        return { x: hit.x, y: -hit.z };
    }

    nearestBase(point) {
        if (!point) return null;
        let best = null;
        let bestDist = BASE_PICK_RADIUS;
        Object.entries(BASES).forEach(([name, base]) => {
            const d = Math.hypot(base.x - point.x, base.y - point.y);
            if (d <= bestDist) { best = name; bestDist = d; }
        });
        return best;
    }

    resolveClick(picked, point) {
        const sel = this.selected;
        if (picked?.kind === 'fielder' || picked?.kind === 'runner') {
            if (sel?.kind === 'fielder' && sel.entity.hasBall && picked.kind === 'fielder' && picked.entity !== sel.entity) {
                this.engine.directThrow(sel.entity, picked.entity);
                return this.clearSelection();
            }
            return this.select(picked.kind, picked.entity);
        }
        if (sel?.kind === 'fielder') {
            if (picked?.kind === 'ball') this.engine.directFielderToBall(sel.entity);
            else if (point) this.engine.directFielder(sel.entity, point);
        } else if (sel?.kind === 'runner') {
            const base = this.nearestBase(point);
            if (base) this.engine.directRunner(sel.entity, base);
        }
        this.clearSelection();
    }

    select(kind, entity) {
        this.clearSelection();
        this.selected = { kind, entity };
        entity.mesh.material.emissive?.setHex(0xffff00);
        if (kind === 'fielder') {
            this.setHint(entity.hasBall
                ? `${entity.positionName} has the ball: click a teammate to throw`
                : `${entity.positionName} selected: click the ball or a spot on the field`);
        } else {
            const bases = this.engine.validRunnerBases(entity).join(', ') || 'none';
            this.setHint(`Runner selected: click a base (${bases})`);
        }
    }

    clearSelection() {
        this.selected?.entity.mesh.material.emissive?.setHex(0x000000);
        this.selected = null;
        this.setHint('');
    }

    setHint(text) {
        this.hint.textContent = text;
        this.hint.style.display = text ? 'block' : 'none';
    }
}
