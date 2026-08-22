const fs = require('fs');
let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');

// Also startPlay must NOT load scenario again if it's already active, otherwise it resets the fielders back to the default spots just before they move. 
// Except wait! we specifically passed `def` into startPlay on the UI button click. 
// If `def` is passed, `startPlay` triggers `loadScenario(def)` which repopulates all meshes exactly when clicking "Hit Ball & Run". 
// To make it run from the ALREADY set positions, we should just fire startPlay() with NO parameters from the UI!
