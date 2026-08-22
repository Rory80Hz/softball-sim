const fs = require('fs');
let code = fs.readFileSync('src/ui/ScenarioEditor.js', 'utf8');

code = code.replace(
    /this\.el\.querySelector\('#btn-start'\)\.addEventListener\('click', \(\) => \{\n             const index = parseInt\(select\.value\);\n             this\.engine\.startPlay\(this\.scenarios\[index\]\.def\);\n        \}\);/,
    `this.el.querySelector('#btn-start').addEventListener('click', () => {
             // Do NOT pass the def here, the engine already has the active scenario loaded,
             // otherwise it resets meshes back to start points wiping out any UI setup/dragging in the future.
             this.engine.startPlay();
        });`
);
fs.writeFileSync('src/ui/ScenarioEditor.js', code);
