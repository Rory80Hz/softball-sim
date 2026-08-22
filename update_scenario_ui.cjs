const fs = require('fs');
let code = fs.readFileSync('src/ui/ScenarioEditor.js', 'utf8');

const replacement = `
        this.scenarios = [
            {
                name: "Runner on 2nd, Hit to LF",
                def: {
                    outfieldPositions: {
                        'LF': { x: -60, y: 160 },
                        'CF': { x: 0, y: 200 },
                        'RF': { x: 60, y: 160 }
                    },
                    runners: [
                        { startPos: BASES.home, playerId: null },
                        { startPos: BASES.second, playerId: null }
                    ],
                    hitTarget: { x: -40, y: 150 },
                    hitSpeed: 60,
                    runnerPaths: [
                        [BASES.first, BASES.second],
                        [BASES.third, BASES.home]
                    ]
                }
            },
            {
                name: "Runner on 1st, Hit to LC",
                def: {
                    outfieldPositions: {
                        // Regular depth
                    },
                    runners: [
                        { startPos: BASES.home, playerId: null },
                        { startPos: BASES.first, playerId: null }
                    ],
                    hitTarget: { x: -20, y: 180 }, // Hit to Left Center
                    hitSpeed: 70,
                    runnerPaths: [
                        [BASES.first], // Batter runs to 1st
                        [BASES.second, BASES.third] // Runner on 1st runs to 3rd
                    ]
                }
            }
        ];

        this.el = document.createElement('div');
        this.el.className = 'panel';
        this.el.style.width = '300px';
        this.el.innerHTML = \`
            <h2>Scenario Test</h2>
            <div style="margin-bottom: 10px;">
                <label>Select Scenario:</label>
                <select id="scenario-select">
                    \${this.scenarios.map((s, i) => \`<option value="\${i}">\${s.name}</option>\`).join('')}
                </select>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn primary" id="btn-start">Hit Ball & Run</button>
                <button class="btn" id="btn-pause">Pause</button>
                <button class="btn" id="btn-resume">Resume</button>
            </div>
        \`;
        this.container.appendChild(this.el);

        const select = this.el.querySelector('#scenario-select');
        
        // Initial load of scenario so players are in position before hit
        this.engine.loadScenario(this.scenarios[0].def);

        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.value);
            this.engine.loadScenario(this.scenarios[index].def);
        });

        this.el.querySelector('#btn-start').addEventListener('click', () => {
             const index = parseInt(select.value);
             this.engine.startPlay(this.scenarios[index].def);
        });
`;

code = code.replace(
    /this\.el = document\.createElement\('div'\);[\s\S]*?this\.engine\.startPlay\(def\);\n        \}\);/,
    replacement.trim()
);

fs.writeFileSync('src/ui/ScenarioEditor.js', code);
