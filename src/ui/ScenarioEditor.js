import { BASES } from '../constants.js';

export class ScenarioEditor {
    constructor(engine, container) {
        this.engine = engine;
        this.container = container;
        
        this.scenarios = [
            {
                name: "Basic Grounder to SS",
                def: {
                    outfieldPositions: {},
                    runners: [{ startPos: BASES.home, playerId: null }],
                    hitTarget: { x: -25, y: 70 },
                    hitType: 'grounder',
                    runnerPaths: [[BASES.first]]
                }
            },
            {
                name: "Pop Up to Infield",
                def: {
                    outfieldPositions: {},
                    runners: [
                        { startPos: BASES.home, playerId: null },
                        { startPos: BASES.first, playerId: null }
                    ],
                    hitTarget: { x: 15, y: 55 },
                    hitType: 'pop_up',
                    runnerPaths: [[], []] // wait and see
                }
            },
            {
                name: "Blooper to Shallow RF",
                def: {
                    outfieldPositions: {},
                    runners: [{ startPos: BASES.home, playerId: null }],
                    hitTarget: { x: 50, y: 130 },
                    hitType: 'blooper',
                    runnerPaths: [[BASES.first]]
                }
            },
            {
                name: "Line Drive to Left Center Gap",
                def: {
                    outfieldPositions: {
                        'LC': { x: -20, y: 220 }, // deeper LC position
                    },
                    runners: [
                        { startPos: BASES.home, playerId: null },
                        { startPos: BASES.second, playerId: null }
                    ],
                    hitTarget: { x: -35, y: 240 },
                    hitType: 'line_drive',
                    runnerPaths: [
                        [BASES.first, BASES.second],
                        [BASES.third, BASES.home]
                    ]
                }
            },
            {
                name: "Deep Flyball to LF",
                def: {
                    outfieldPositions: {},
                    runners: [{ startPos: BASES.home, playerId: null }],
                    hitTarget: { x: -70, y: 270 },
                    hitType: 'flyball',
                    runnerPaths: [[BASES.first, BASES.second]]
                }
            }
        ];

        this.el = document.createElement('div');
        this.el.className = 'panel';
        this.el.style.width = '300px';
        this.el.innerHTML = `
            <h2>Scenario Test</h2>
            <div style="margin-bottom: 10px;">
                <label>Select Scenario:</label>
                <select id="scenario-select">
                    ${this.scenarios.map((s, i) => `<option value="${i}">${s.name}</option>`).join('')}
                </select>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn primary" id="btn-start">Hit Ball & Run</button>
                <button class="btn" id="btn-pause">Pause</button>
                <button class="btn" id="btn-resume">Resume</button>
                <button class="btn danger" id="btn-reset">Reset</button>
            </div>
        `;
        this.container.appendChild(this.el);

        const select = this.el.querySelector('#scenario-select');
        
        // Initial load of scenario so players are in position before hit
        this.engine.loadScenario(this.scenarios[0].def);

        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.value);
            this.engine.loadScenario(this.scenarios[index].def);
        });

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
        
        this.el.querySelector('#btn-pause').addEventListener('click', () => this.engine.pause());
        this.el.querySelector('#btn-resume').addEventListener('click', () => this.engine.resume());

        this.engine.onEvent = (e) => {
            if (e.type === 'ball_caught') {
                alert(`${e.fielder.player.name} caught the ball! Click where to throw (not implemented yet).`);
            }
        };
    }
}
