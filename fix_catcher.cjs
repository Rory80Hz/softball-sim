const fs = require('fs');

let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');

// The catcher is at (0, -3). The ball is spawned at (0, 0). 
// Since our catch radius is 8ft, the catcher is instantly inside the ball's radius the moment the play starts!
// We need to implement a rule that suppresses catches until the ball clears the immediate batter's box area (e.g., > 15 ft away).

const updatedCatchLogic = `
        // Simple check: did a fielder reached the ball?
        if (this.ball.active) {
            const distFromHome = Math.hypot(this.ball.pos.x, this.ball.pos.y);

            for(let f of this.fielders) {
                if(!f.active) continue;
                
                // Prevent catcher from instantly intercepting hits while over the plate
                if (f.positionName === 'C' && distFromHome < 15) continue;

                const fielderZ = 4; // Fielder is at height 4ft
`;

engine = engine.replace(
    /[\s]*\/\/ Simple check: did a fielder reached the ball\?\n[\s]*if \(this\.ball\.active\) \{\n(?:[\s]*for\(let f of this\.fielders\) \{\n)?[\s]*if\(!f\.active\) continue;\n[\s]*const fielderZ = 4; \/\/ Fielder is at height 4ft/m,
    updatedCatchLogic
);

// If the regex above fails because of formatting, let's just do a simpler string replace:
fs.writeFileSync('src/sim/Engine.js', engine);
