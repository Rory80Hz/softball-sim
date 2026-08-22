const fs = require('fs');

let field = fs.readFileSync('src/field/Field.js', 'utf8');

// I replaced `export function buildField() {` previously with the end of another function. I corrupted the JS! I need to put the end back into `chalkStrip` where it belonged, or delete the dangling mesh.

// Restore the original buildField
field = field.replace(
    /const mesh = new THREE\.Mesh\(geometry, material\);\n    mesh\.position\.y = y;\n    return mesh;\n\}\n\nfunction dottedLineStrip\(/,
    'function dottedLineStrip('
);

fs.writeFileSync('src/field/Field.js', field);
