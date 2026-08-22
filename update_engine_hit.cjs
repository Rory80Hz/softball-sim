const fs = require('fs');
let code = fs.readFileSync('src/sim/Engine.js', 'utf8');

// Update hit execution to pass hitType
code = code.replace(
    /this\.ball\.hit\(this\.scenario\.hitTarget\.x, this\.scenario\.hitTarget\.y, this\.scenario\.hitSpeed \|\| 80\);/,
    'this.ball.hit(this.scenario.hitTarget.x, this.scenario.hitTarget.y, this.scenario.hitSpeed || 80, this.scenario.hitType || \'grounder\');'
);
fs.writeFileSync('src/sim/Engine.js', code);
