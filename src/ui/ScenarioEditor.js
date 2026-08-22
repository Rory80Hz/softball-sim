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

            <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
                <label>Camera Controls</label>
                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 5px;">
                    <button class="btn" id="btn-cam-top">Top View</button>
                    <button class="btn" id="btn-cam-3d">3D View (Home)</button>
                </div>
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

        // Camera Controls
        this.el.querySelector('#btn-cam-top').addEventListener('click', () => {
             const scene = this.engine.scene;
             const camera = scene.parentCamera; // we need to expose this, actually FieldScene owns camera
             if (window.appScene) {
                 window.appScene.camera.position.set(window.appScene.viewCenter.x, 260, window.appScene.viewCenter.z);
                 window.appScene.camera.up.set(0, 0, -1);
                 window.appScene.camera.lookAt(window.appScene.viewCenter.x, 0, window.appScene.viewCenter.z);
                 window.appScene.controls.target.set(window.appScene.viewCenter.x, 0, window.appScene.viewCenter.z);
             }
        });
        
        this.el.querySelector('#btn-cam-3d').addEventListener('click', () => {
             if (window.appScene) {
                 // Move camera low behind home plate, looking out to center field
                 window.appScene.camera.position.set(0, 30, 80); 
                 window.appScene.camera.up.set(0, 1, 0); // Need standard Y-up for 3D perspective
                 window.appScene.camera.lookAt(0, 0, -150); // Look towards second base / CF
                 window.appScene.controls.target.set(0, 0, -150);
             }
        });

        this.engine.onEvent = (e) => {

            if (e.type === 'ball_caught') {
                alert(`${e.fielder.player.name} caught the ball! Click where to throw (not implemented yet).`);
            }
        };
    }
}
