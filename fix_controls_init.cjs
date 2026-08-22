const fs = require('fs');
let content = fs.readFileSync('src/field/Scene.js', 'utf8');

// The domElement isn't passed when camera is init due to how I injected it.
content = content.replace(
    'this.controls = new OrbitControls(this.camera, this.renderer.domElement);',
    '// deferred'
);
content = content.replace(
    'container.appendChild(this.renderer.domElement);',
    'container.appendChild(this.renderer.domElement);\n    this.controls = new OrbitControls(this.camera, this.renderer.domElement);\n    this.controls.enableRotate = false;\n    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.NONE };'
);
content = content.replace(
    'this.controls.enableRotate = false;\n    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.NONE };',
    ''
);
fs.writeFileSync('src/field/Scene.js', content.replace(/\/\/ deferred\n/g, ''));
