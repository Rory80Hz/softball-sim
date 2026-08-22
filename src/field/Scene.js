import * as THREE from 'three';
import { buildField } from './Field.js';
import { toWorld } from './Field.js';
import { FIELD } from '../constants.js';

// Wraps renderer/camera/scene setup for the top-down field view. The
// orthographic camera's view volume is always sized from FIELD.fenceDistance
// (plus a little padding) so proportions stay accurate regardless of the
// screen/canvas size - only the framing padding changes, never the scale.
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SimulationEngine } from "../sim/Engine.js";
import { createStore } from "../store.js";

export class FieldScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);

    // The field's playable bounding box isn't centered on home plate - it
    // extends ~300' toward center field but only ~12' behind the plate.
    // Frame the camera on the box's center (with a little padding) so the
    // whole field fills the view at a consistent, undistorted feet-per-pixel
    // scale no matter the viewport's aspect ratio.
    const pad = 1.06;
    const minX = -FIELD.fenceDistance * Math.SQRT1_2 * pad;
    const maxX = FIELD.fenceDistance * Math.SQRT1_2 * pad;
    const minY = -30;
    const maxY = FIELD.fenceDistance * pad;
    this.bounds = { minX, maxX, minY, maxY };
    this.boundsHalfWidth = (maxX - minX) / 2;
    this.boundsHalfHeight = (maxY - minY) / 2;
    const centerX = (maxX + minX) / 2;
    const centerY = (maxY + minY) / 2;
    this.viewCenter = toWorld(centerX, centerY);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.camera.position.set(this.viewCenter.x, 260, this.viewCenter.z);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(this.viewCenter.x, 0, this.viewCenter.z);

        

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = true;
    this.controls.maxPolarAngle = Math.PI / 2.1; // dont go under the field
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.NONE };

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(80, 200, 120);
    sun.castShadow = true;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    this.scene.add(sun);

    this.fieldGroup = buildField();
    this.scene.add(this.fieldGroup);

    this.tokensGroup = new THREE.Group();
    this.tokensGroup.name = 'tokens';
    this.scene.add(this.tokensGroup);

    this._raycaster = new THREE.Raycaster();
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();

    this._animateCallbacks = new Set();
    this._clock = new THREE.Clock();
    this._raf = null;
    this._tick = this._tick.bind(this);
    this.engine = new SimulationEngine(this.scene, createStore());
    this.engine.onEvent = (e) => console.log(e);
    this._tick();
  }

  onFrame(fn) {
    this._animateCallbacks.add(fn);
    return () => this._animateCallbacks.delete(fn);
  }

  _tick() {
    const dt = Math.min(this._clock.getDelta(), 0.1);
    this._animateCallbacks.forEach((fn) => fn(dt));
    this.engine.update(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._tick);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / h;
    let halfW = this.boundsHalfWidth;
    let halfH = this.boundsHalfHeight;
    if (halfW / halfH > aspect) {
      halfH = halfW / aspect;
    } else {
      halfW = halfH * aspect;
    }
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // Projects a mouse/pointer event to a field-space (x,y) point on the
  // ground plane (y = 0 in world space).
  pointerToFieldPos(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const point = new THREE.Vector3();
    this._raycaster.ray.intersectPlane(this._groundPlane, point);
    if (!point) return null;
    return { x: point.x, y: -point.z };
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    if (this._raf) cancelAnimationFrame(this._raf);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
