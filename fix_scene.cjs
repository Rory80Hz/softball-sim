const fs = require('fs');

let scene = fs.readFileSync('src/field/Scene.js', 'utf8');
scene = scene.replace(
    'this.scene.background = new THREE.Color(0x0d1117);',
    'this.scene.background = new THREE.Color(0x87CEEB); // Sky blue color\n    // Create a large ground plane extending to horizon\n    const horizonGeometry = new THREE.PlaneGeometry(5000, 5000);\n    const horizonMaterial = new THREE.MeshLambertMaterial({ color: 0x3d7e39 }); // Darker grass/forest floor\n    const horizonPlane = new THREE.Mesh(horizonGeometry, horizonMaterial);\n    horizonPlane.rotation.x = -Math.PI / 2;\n    horizonPlane.position.y = -0.1; // Just below the field\n    horizonPlane.receiveShadow = true;\n    this.scene.add(horizonPlane);'
);

scene = scene.replace(
    /this\.controls\.mouseButtons = \{ LEFT: THREE\.MOUSE\.PAN, MIDDLE: THREE\.MOUSE\.DOLLY, RIGHT: THREE\.MOUSE\.NONE \};/,
    'this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };'
);

fs.writeFileSync('src/field/Scene.js', scene);
