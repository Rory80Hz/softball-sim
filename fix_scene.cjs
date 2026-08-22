const fs = require('fs');

let scene = fs.readFileSync('src/field/Scene.js', 'utf8');
scene = scene.replace(
    /this\.controls\.enableRotate = false;/,
    'this.controls.enableRotate = true;\n    this.controls.maxPolarAngle = Math.PI / 2.1; // dont go under the field'
);
fs.writeFileSync('src/field/Scene.js', scene);
