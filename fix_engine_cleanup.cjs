const fs = require('fs');

let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');

// The fielders need to be returned to their red color on reset / restart play
engine = engine.replace(
    /fielder\.setPosition\(pos\.x, pos\.y\);/,
    'fielder.setPosition(pos.x, pos.y);\n               fielder.mesh.material.color.setHex(0xff3333);'
);

fs.writeFileSync('src/sim/Engine.js', engine);
