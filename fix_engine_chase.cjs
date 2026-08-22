const fs = require('fs');

let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');

// For the LF chase logic, we should probably just make the closest outfielder chase the ball for the demo right now otherwise if we hit to LC or RC, the LF still chases it.
const chaseLogic = `
           // Make closest fielder chase ball
           let closest = null;
           let minDist = Infinity;
           this.fielders.forEach(f => {
               if(!f.active) return;
               const d = Math.hypot(f.pos.x - this.scenario.hitTarget.x, f.pos.y - this.scenario.hitTarget.y);
               if(d < minDist) {
                   minDist = d;
                   closest = f;
               }
           });
           if(closest) closest.moveTo(this.scenario.hitTarget.x, this.scenario.hitTarget.y);
`;

engine = engine.replace(
    /\/\/ Make LF chase ball[\s\S]*?if\(lf\) lf\.moveTo\(this\.scenario\.hitTarget\.x, this\.scenario\.hitTarget\.y\);/,
    chaseLogic.trim()
);

fs.writeFileSync('src/sim/Engine.js', engine);
