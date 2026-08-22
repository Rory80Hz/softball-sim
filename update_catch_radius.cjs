const fs = require('fs');

let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');

// Replace the 8ft catch radius with a 4.5ft radius.
// - At 4ft vertical center, a 4.5ft radius means:
//   - Reach up to 8.5ft high (realistic jump/reach).
//   - Horizontal ground reach (z=0) is approx 2.06ft (closer to feet).
engine = engine.replace(
    /if \(distToBall < 8\) \{/,
    'if (distToBall < 4.5) { // 4.5ft realistic reach radius'
);

fs.writeFileSync('src/sim/Engine.js', engine);
