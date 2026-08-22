const fs = require('fs');

// --- 1. Ball Friction ---
let ball = fs.readFileSync('src/sim/Ball.js', 'utf8');
const ballUpdateReplacement = `
        // Gravity
        if (this.pos.z > 0 || this.velocity.z > 0) {
            this.velocity.z += -32.2 * dt;
            this.pos.z += this.velocity.z * dt;
            
            if (this.pos.z <= 0) {
                this.pos.z = 0;
                this.velocity.z = 0; // stop bouncing for now, just roll
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
`;
ball = ball.replace(/[\s]*\/\/ Gravity[\s\S]*?this\.velocity\.z = 0; \/\/ stop bouncing for now, just roll\n            \}\n        \}/, ballUpdateReplacement.trimEnd());
fs.writeFileSync('src/sim/Ball.js', ball);

// --- 2. 3D Catch Detection ---
let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');
engine = engine.replace(
    /const distToBall = Math\.hypot\(f\.pos\.x - this\.ball\.pos\.x, f\.pos\.y - this\.ball\.pos\.y\);/,
    'const fielderZ = 4; // Fielder is at height 4ft\n                const distToBall = Math.hypot(f.pos.x - this.ball.pos.x, f.pos.y - this.ball.pos.y, fielderZ - this.ball.pos.z);'
);
engine = engine.replace(
    /if \(distToBall < 3\) \{/,
    'if (distToBall < 8) {' // 8ft catch radius
);
fs.writeFileSync('src/sim/Engine.js', engine);

// --- 3. Player Heights (Visuals) ---
let fielder = fs.readFileSync('src/sim/Fielder.js', 'utf8');
fielder = fielder.replace(/this\.mesh\.position\.set\(worldPos\.x, 3, worldPos\.z\);/, 'this.mesh.position.set(worldPos.x, 4, worldPos.z);');
fs.writeFileSync('src/sim/Fielder.js', fielder);

let runner = fs.readFileSync('src/sim/Runner.js', 'utf8');
runner = runner.replace(/this\.mesh\.position\.set\(worldPos\.x, 3, worldPos\.z\);/, 'this.mesh.position.set(worldPos.x, 4, worldPos.z);');
fs.writeFileSync('src/sim/Runner.js', runner);

