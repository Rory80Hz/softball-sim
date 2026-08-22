const fs = require('fs');

let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');

// I changed startPlay to take `scenarioDef`, but it's expecting to just start an already loaded scenario, except the UI passes the def to startPlay without loadScenario being called!
engine = engine.replace(
    /startPlay\(\) \{/,
    'startPlay(def) {\n       if (def) this.loadScenario(def);'
);

// We should also make the LF fielder chase the ball since he's out there
engine = engine.replace(
    /this\.ball\.hit\(this\.scenario\.hitTarget\.x, this\.scenario\.hitTarget\.y, this\.scenario\.hitSpeed \|\| 80\);/,
    'this.ball.hit(this.scenario.hitTarget.x, this.scenario.hitTarget.y, this.scenario.hitSpeed || 80);\n           // Make LF chase ball\n           const lf = this.fielders.find(f => f.positionName === \'LF\');\n           if(lf) lf.moveTo(this.scenario.hitTarget.x, this.scenario.hitTarget.y);'
);
fs.writeFileSync('src/sim/Engine.js', engine);
