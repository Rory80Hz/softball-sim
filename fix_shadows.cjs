const fs = require('fs');

// 1. Enable Shadows in Scene renderer and lighting
let scene = fs.readFileSync('src/field/Scene.js', 'utf8');
scene = scene.replace(
    'this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));',
    'this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));\n    this.renderer.shadowMap.enabled = true;\n    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;'
);
scene = scene.replace(
    'sun.position.set(80, 200, 120);',
    'sun.position.set(80, 200, 120);\n    sun.castShadow = true;\n    sun.shadow.camera.near = 0.5;\n    sun.shadow.camera.far = 500;\n    sun.shadow.camera.left = -200;\n    sun.shadow.camera.right = 200;\n    sun.shadow.camera.top = 200;\n    sun.shadow.camera.bottom = -200;\n    sun.shadow.mapSize.width = 1024;\n    sun.shadow.mapSize.height = 1024;'
);
fs.writeFileSync('src/field/Scene.js', scene);

// 2. Enable ball & player to cast shadow
let ball = fs.readFileSync('src/sim/Ball.js', 'utf8');
ball = ball.replace(
    'this.mesh.visible = false;',
    'this.mesh.visible = false;\n        this.mesh.castShadow = true;'
);
fs.writeFileSync('src/sim/Ball.js', ball);

let runner = fs.readFileSync('src/sim/Runner.js', 'utf8');
runner = runner.replace(
    'scene.add(this.mesh);',
    'this.mesh.castShadow = true;\n        scene.add(this.mesh);'
);
fs.writeFileSync('src/sim/Runner.js', runner);

let fielder = fs.readFileSync('src/sim/Fielder.js', 'utf8');
fielder = fielder.replace(
    'scene.add(this.mesh);',
    'this.mesh.castShadow = true;\n        scene.add(this.mesh);'
);
fs.writeFileSync('src/sim/Fielder.js', fielder);

// 3. Make grass/dirt receive shadow in Field.js
let field = fs.readFileSync('src/field/Field.js', 'utf8');
field = field.replace(
    'const mesh = new THREE.Mesh(geometry, material);',
    'const mesh = new THREE.Mesh(geometry, material);\n  mesh.receiveShadow = true;'
);
fs.writeFileSync('src/field/Field.js', field);

