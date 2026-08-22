const fs = require('fs');

let main = fs.readFileSync('src/main.js', 'utf8');

// Expose the scene instance globally so the UI buttons can fetch and manipulate its camera easily
main = main.replace(
    'const scene = new FieldScene(container);',
    'const scene = new FieldScene(container);\nwindow.appScene = scene; // Expose for UI camera manipulation'
);

fs.writeFileSync('src/main.js', main);
