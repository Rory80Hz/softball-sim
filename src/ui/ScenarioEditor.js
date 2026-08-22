import { BASES } from '../constants.js';

export class ScenarioEditor {
    constructor(engine, container) {
        this.engine = engine;
        this.container = container;
        
        this.hitTypes = [
            ['grounder', 'Grounder'],
            ['line_drive', 'Line drive'],
            ['blooper', 'Blooper'],
            ['flyball', 'Fly ball'],
            ['pop_up', 'Pop-up'],
        ];
        this.hitLocations = [
            ['ss', 'Shortstop', { x: -25, y: 70 }],
            ['left_infield', 'Left infield', { x: -20, y: 105 }],
            ['right_infield', 'Right infield', { x: 25, y: 105 }],
            ['left_center', 'Left center', { x: -35, y: 220 }],
            ['center', 'Center field', { x: 0, y: 245 }],
            ['right_center', 'Right center', { x: 35, y: 220 }],
            ['deep_left', 'Deep left field', { x: -70, y: 270 }],
            ['deep_right', 'Deep right field', { x: 70, y: 270 }],
        ];
        this.runnerOptions = [{ label: 'Bases empty', bases: [] }];
        for (let mask = 1; mask < 8; mask += 1) {
            const bases = ['first', 'second', 'third'].filter((_, index) => mask & (1 << index));
            this.runnerOptions.push({
                label: bases.map(base => base[0].toUpperCase() + base.slice(1)).join(' + '),
                bases,
            });
        }

        this.el = document.createElement('div');
        this.el.className = 'panel play-config';
        this.el.innerHTML = `
            <h2>Play Setup</h2>
            <label for="hit-type">Hit type</label>
            <select id="hit-type">
                ${this.hitTypes.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
            </select>
            <label for="hit-location" style="margin-top: 8px;">Location to hit</label>
            <select id="hit-location">
                ${this.hitLocations.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
            </select>
            <label for="runner-option" style="margin-top: 8px;">Runners on base</label>
            <select id="runner-option">
                ${this.runnerOptions.map((option, index) => `<option value="${index}">${option.label}</option>`).join('')}
            </select>
            <div style="display: flex; gap: 5px;">
                <button class="btn primary icon-btn" id="btn-start" aria-label="Start play" title="Start play">&#9654;</button>
                <button class="btn icon-btn" id="btn-pause" aria-label="Pause play" title="Pause play">&#10074;&#10074;</button>
                <button class="btn icon-btn" id="btn-resume" aria-label="Resume play" title="Resume play">&#9654;</button>
                <button class="btn danger icon-btn" id="btn-reset" aria-label="Reset play" title="Reset play">&#8635;</button>
            </div>
            <p id="play-status" style="margin: 10px 0 0; color: var(--text-dim);">Runs: 0 | Outs: 0</p>
            <div id="event-ticker" class="event-ticker" aria-live="polite"></div>

            <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
                <label>Camera Controls</label>
                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 5px;">
                    <button class="btn icon-btn" id="btn-cam-top" aria-label="Top view" title="Top view">&#8862;</button>
                    <button class="btn icon-btn" id="btn-cam-3d" aria-label="3D view" title="3D view">&#9670;</button>
                </div>
            </div>
            
        `;
        this.container.appendChild(this.el);


        const hitType = this.el.querySelector('#hit-type');
        const hitLocation = this.el.querySelector('#hit-location');
        const runnerOption = this.el.querySelector('#runner-option');
        const resetScoreboard = () => {
            this.el.querySelector('#play-status').textContent = 'Runs: 0 | Outs: 0';
            this.el.querySelector('#event-ticker').replaceChildren();
        };

        const addTickerEvent = message => {
            const ticker = this.el.querySelector('#event-ticker');
            const item = document.createElement('div');
            item.textContent = message;
            ticker.prepend(item);
            while (ticker.children.length > 5) ticker.lastElementChild.remove();
        };
        
        // Initial load of scenario so players are in position before hit
        this.engine.loadScenario(this.getDefinition(hitType, hitLocation, runnerOption));

        const rebuild = () => {
            this.engine.loadScenario(this.getDefinition(hitType, hitLocation, runnerOption));
            resetScoreboard();
        };
        hitType.addEventListener('change', rebuild);
        hitLocation.addEventListener('change', rebuild);
        runnerOption.addEventListener('change', rebuild);

        this.el.querySelector('#btn-start').addEventListener('click', () => {
             // Reset first so if they click it mid-play or after a play, it restarts clean
             this.engine.loadScenario(this.getDefinition(hitType, hitLocation, runnerOption));
             resetScoreboard();
             
             // Start the run
             this.engine.startPlay();
        });

        this.el.querySelector('#btn-reset').addEventListener('click', () => {
             this.engine.loadScenario(this.getDefinition(hitType, hitLocation, runnerOption));
               resetScoreboard();
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
            if (e.type === 'play_started') addTickerEvent(`Hit: ${e.hitType.replace('_', ' ')} toward the configured location`);
            if (e.type === 'fielder_call') addTickerEvent(`${e.fielder.positionName} calls the ball`);
            if (e.type === 'ball_collected') addTickerEvent(`${e.fielder.positionName} fields the ball`);
            if (e.type === 'ball_thrown') addTickerEvent(`${e.fielder.positionName} throws to ${e.playType === 'force' ? 'the base' : 'contain the runner'}`);
            if (e.type === 'runner_cut_off') addTickerEvent(`Runner cut off at ${e.baseName}`);
            if (e.type === 'tag_attempt') addTickerEvent(`${e.fielder.positionName} attempts a tag`);
            if (e.type === 'run_scored') {
                this.el.querySelector('#play-status').textContent = `Runs: ${e.score} | Outs: ${this.engine.outs}`;
                addTickerEvent('Run scored');
            }
            if (e.type === 'runner_out') {
                this.el.querySelector('#play-status').textContent = `Runs: ${this.engine.score} | Outs: ${e.outs}`;
                addTickerEvent('Runner out');
            }
            if (e.type === 'play_stopped') addTickerEvent(`Play stopped: ${e.reason.replace('_', ' ')}`);
        };
    }

    getDefinition(hitType, hitLocation, runnerOption) {
        const location = this.hitLocations.find(([value]) => value === hitLocation.value);
        const selectedRunners = this.runnerOptions[Number(runnerOption.value)].bases;
        const baseOrder = ['first', 'second', 'third', 'home'];
        const runners = [{ startPos: BASES.home, playerId: null }];
        const runnerPaths = [baseOrder.map(base => BASES[base])];

        selectedRunners.forEach(base => {
            runners.push({ startPos: BASES[base], playerId: null });
            const startIndex = baseOrder.indexOf(base);
            runnerPaths.push(baseOrder.slice(startIndex + 1).map(nextBase => BASES[nextBase]));
        });

        return {
            outfieldPositions: {},
            runners,
            hitTarget: { ...location[2] },
            hitType: hitType.value,
            runnerPaths,
        };
    }
}
