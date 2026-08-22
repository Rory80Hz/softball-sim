const fs = require('fs');

let ui = fs.readFileSync('src/ui/ScenarioEditor.js', 'utf8');

// 1. Add "Reset" button to UI
ui = ui.replace(
    /<button class="btn" id="btn-resume">Resume<\/button>/,
    '<button class="btn" id="btn-resume">Resume</button>\n                <button class="btn danger" id="btn-reset">Reset</button>'
);

// 2. Hook up Reset logic, and ensure Hit Ball & Run resets first.
const replaceLogic = `
        this.el.querySelector('#btn-start').addEventListener('click', () => {
             // Reset first so if they click it mid-play or after a play, it restarts clean
             const index = parseInt(select.value);
             this.engine.loadScenario(this.scenarios[index].def);
             
             // Start the run
             this.engine.startPlay();
        });

        this.el.querySelector('#btn-reset').addEventListener('click', () => {
             const index = parseInt(select.value);
             this.engine.loadScenario(this.scenarios[index].def);
        });
`;

ui = ui.replace(
    /this\.el\.querySelector\('#btn-start'\)\.addEventListener\('click', \(\) => \{[\s\S]*?this\.engine\.startPlay\(\);\n        \}\);/,
    replaceLogic.trim()
);

fs.writeFileSync('src/ui/ScenarioEditor.js', ui);

