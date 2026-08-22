const fs = require('fs');

let ball = fs.readFileSync('src/sim/Ball.js', 'utf8');

// The ball geometry is 0.5 sphere by default. Let's make it a bit more visible (bump radius from 0.5 to 1.0 or 0.8) and keep it yellow. 
// "yellow" in hex for standard softball optic yellow is ~0xccff00 
ball = ball.replace(
    /new THREE\.SphereGeometry\(0\.5, 16, 16\)/,
    'new THREE.SphereGeometry(1.0, 16, 16)' // make it slightly bigger so it's easier to see
);
ball = ball.replace(
    /color: 0xeebb44, emissive: 0x444400/,
    'color: 0xffff00, emissive: 0x444400' // bright optic yellow
);
// In the update mesh, the Y position was set relative to worldPos.y but limited to 0.5. 
// Let's set it to 1.0 so it floats clearly above the ground plane.
ball = ball.replace(
    /Math\.max\(worldPos\.y, 0\.5\)/,
    'Math.max(worldPos.y, 1.0)'
);

fs.writeFileSync('src/sim/Ball.js', ball);
