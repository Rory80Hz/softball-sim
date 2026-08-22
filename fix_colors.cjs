const fs = require('fs');

// 1. Fix Runner.js (Batting team = blue)
let runner = fs.readFileSync('src/sim/Runner.js', 'utf8');
runner = runner.replace('0xff3333', '0x3333ff'); // Red to Blue
// And we want dots (spheres)
runner = runner.replace('new THREE.CylinderGeometry(1.5, 1.5, 6, 8)', 'new THREE.SphereGeometry(2.5, 16, 16)');
fs.writeFileSync('src/sim/Runner.js', runner);

// 2. Fix Fielder.js (Catching team = red)
let fielder = fs.readFileSync('src/sim/Fielder.js', 'utf8');
fielder = fielder.replace('0x4444ff', '0xff3333'); // Blue to Red
// Dots
fielder = fielder.replace('new THREE.CylinderGeometry(1.5, 1.5, 6, 8)', 'new THREE.SphereGeometry(2.5, 16, 16)');
fs.writeFileSync('src/sim/Fielder.js', fielder);

// 3. Fix Engine.js (Green when caught)
let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');
engine = engine.replace('this.handleBallCaught(f);', 'f.mesh.material.color.setHex(0x33ff33);\n                    this.handleBallCaught(f);');
fs.writeFileSync('src/sim/Engine.js', engine);
