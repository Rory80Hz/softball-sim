const fs = require('fs');

let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');

// I am modifying `update` so that the closest fielder ALWAYS dynamically chases the current ball coordinates instead of just going to `hitTarget` once up front. This way they track it across its bounce and try to get to its rolling spot if they missed the intercept.
const updateLogic = `
    update(dt) {
        if(this.state !== 'playing') return;
        
        this.ball.update(dt);
        this.runners.forEach(r => r.update(dt));
        
        // Find closest fielder and make them chase the active ball position actively
        if (this.ball.active) {
            let closest = null;
            let minDist = Infinity;
            this.fielders.forEach(f => {
                if(!f.active) return;
                const d = Math.hypot(f.pos.x - this.ball.pos.x, f.pos.y - this.ball.pos.y);
                if(d < minDist) {
                    minDist = d;
                    closest = f;
                }
            });
            if (closest) {
                closest.moveTo(this.ball.pos.x, this.ball.pos.y);
            }
        }
        
        this.fielders.forEach(f => f.update(dt));
        
        // Simple check: did a fielder reached the ball?
`;

// Replace `update(dt) {` up until the catch check
engine = engine.replace(
    /update\(dt\) \{[\s\S]*?\/\/ Simple check:/,
    updateLogic.trim() + '\n        // Simple check:'
);

// Delete the old static "Start Play chase" logic because it's now handled smoothly inside the update loop
engine = engine.replace(
    /[\s]*\/\/ Make closest fielder chase ball[\s\S]*?if\(closest\) closest\.moveTo\(this\.scenario\.hitTarget\.x, this\.scenario\.hitTarget\.y\);/m,
    ''
);

fs.writeFileSync('src/sim/Engine.js', engine);
