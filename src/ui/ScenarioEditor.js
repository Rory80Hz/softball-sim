import { BASES, OUTFIELD_LAYOUTS } from '../constants.js';

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
            <div class="setup-header">
                <h2>Play Setup</h2>
                <button class="btn icon-btn" id="btn-collapse" aria-label="Collapse play setup" aria-expanded="true" title="Collapse / expand play setup">&#9662;</button>
            </div>
            <div id="setup-details">
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
            <label for="outfield-layout" style="margin-top: 8px;">Outfield</label>
            <select id="outfield-layout">
                ${Object.entries(OUTFIELD_LAYOUTS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
            </select>
            <label for="batter-select" style="margin-top: 8px;">Batter</label>
            <select id="batter-select"></select>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn primary icon-btn" id="btn-start" aria-label="Start hit and run" title="Start hit and run">&#129358;</button>
                <button class="btn icon-btn" id="btn-pause" aria-label="Pause play" title="Pause play">&#10074;&#10074;</button>
                <button class="btn icon-btn" id="btn-resume" aria-label="Resume play" title="Resume play">&#9654;</button>
                <button class="btn danger icon-btn" id="btn-reset" aria-label="Reset play" title="Reset play">&#8635;</button>
                <button class="btn icon-btn" id="btn-random" aria-label="Randomise play" title="Randomise hit type, location and runners">&#127922;</button>
                <button class="btn icon-btn" id="btn-time" aria-label="Call time and end play" title="Call time and end play">&#9200;</button>
            </div>
            <p id="play-status" style="margin: 10px 0 0; color: var(--text-dim);">Runs: 0 | Outs: 0</p>
            <div id="event-ticker" class="event-ticker" aria-live="polite"></div>

            <div id="camera-section" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
                <label>Camera Controls</label>
                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 5px;">
                    <button class="btn icon-btn" id="btn-cam-3d" aria-label="Reset 3D view" title="Reset 3D view">&#9670;</button>
                </div>
                <output id="camera-status" class="camera-status" aria-live="polite">3D view</output>
            </div>
            
        `;
        this.container.appendChild(this.el);


        const hitType = this.el.querySelector('#hit-type');
        const hitLocation = this.el.querySelector('#hit-location');
        const runnerOption = this.el.querySelector('#runner-option');
        const batterSelect = this.el.querySelector('#batter-select');
        const outfieldLayout = this.el.querySelector('#outfield-layout');
        const battingTeam = this.engine.store.getTeams()[1];
        batterSelect.innerHTML = battingTeam.players
            .slice()
            .sort((a, b) => a.battingOrder - b.battingOrder)
            .map(player => `<option value="${player.id}">${player.number ?? player.battingOrder} - ${player.name}</option>`)
            .join('');
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
        this.engine.loadScenario(this.getDefinition(hitType, hitLocation, runnerOption, batterSelect, outfieldLayout));

        const rebuild = () => {
            this.engine.loadScenario(this.getDefinition(hitType, hitLocation, runnerOption, batterSelect, outfieldLayout));
            resetScoreboard();
        };
        hitType.addEventListener('change', rebuild);
        hitLocation.addEventListener('change', rebuild);
        runnerOption.addEventListener('change', rebuild);
        batterSelect.addEventListener('change', rebuild);
        // Dragged positions belong to a layout, so switching layout restores defaults.
        outfieldLayout.addEventListener('change', () => {
            if (this.engine.scenario) this.engine.scenario.outfieldPositions = {};
            rebuild();
        });

        this.el.querySelector('#btn-start').addEventListener('click', () => {
             // Reset first so if they click it mid-play or after a play, it restarts clean
             this.engine.loadScenario(this.getDefinition(hitType, hitLocation, runnerOption, batterSelect, outfieldLayout));
             resetScoreboard();
             
             // Start the run
             this.engine.startPlay();
        });

        const collapseButton = this.el.querySelector('#btn-collapse');
        collapseButton.addEventListener('click', () => {
            const collapsed = this.el.classList.toggle('collapsed');
            collapseButton.innerHTML = collapsed ? '&#9656;' : '&#9662;';
            collapseButton.setAttribute('aria-expanded', String(!collapsed));
        });

        // Reset also discards dragged outfield positions.
        this.el.querySelector('#btn-reset').addEventListener('click', () => {
             if (this.engine.scenario) this.engine.scenario.outfieldPositions = {};
             this.engine.loadScenario(this.getDefinition(hitType, hitLocation, runnerOption, batterSelect, outfieldLayout));
               resetScoreboard();
        });
        
        this.el.querySelector('#btn-random').addEventListener('click', () => {
            this.randomizeSelections([hitType, hitLocation, runnerOption]);
            rebuild();
        });

        this.el.querySelector('#btn-pause').addEventListener('click', () => this.engine.pause());

        this.el.querySelector('#btn-resume').addEventListener('click', () => this.engine.resume());
        this.el.querySelector('#btn-time').addEventListener('click', () => this.engine.endPlay());

        this.el.querySelector('#btn-cam-3d').addEventListener('click', () => {
             if (window.appScene) {
                 window.appScene.reset3DView();
             }
        });
        if (window.appScene) {
            window.appScene.onFrame(() => {
                const camera = window.appScene.camera;
                const height = Math.round(camera.position.y);
                const elevation = Math.round(Math.atan2(
                    camera.position.y,
                    Math.hypot(camera.position.x - window.appScene.controls.target.x, camera.position.z - window.appScene.controls.target.z)
                ) * 180 / Math.PI);
                this.el.querySelector('#camera-status').textContent = `3D view | height ${height} ft | elevation ${elevation} deg`;
            });
        }

        this.engine.onEvent = (e) => {
            if (e.type === 'play_started') addTickerEvent(`Hit: ${e.hitType.replace('_', ' ')} toward the configured location`);
            if (e.type === 'fielder_call') addTickerEvent(`${e.fielder.positionName} calls the ball`);
            if (e.type === 'ball_collected') addTickerEvent(`${e.fielder.positionName} fields the ball`);
            if (e.type === 'ball_bobbled') addTickerEvent(`${e.fielder.positionName} bobbles the ball!`);
            if (e.type === 'ball_thrown') addTickerEvent(`${e.fielder.positionName} throws to ${e.playType === 'force' ? 'the base' : 'contain the runner'}`);
            if (e.type === 'manual_move') addTickerEvent(`${e.fielder.positionName} heads to the spot you picked`);
            if (e.type === 'manual_chase') addTickerEvent(`${e.fielder.positionName} goes after the ball`);
            if (e.type === 'manual_throw') addTickerEvent(`${e.fielder.positionName} throws to ${e.receiver.positionName}`);
            if (e.type === 'manual_run') addTickerEvent(`Runner sent to ${e.baseName}`);
            if (e.type === 'runner_cut_off') addTickerEvent(`Runner cut off at ${e.baseName}`);
            if (e.type === 'runner_held') addTickerEvent(`Runner holds at ${e.baseName}`);
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

    randomizeSelections(selects) {
        selects.forEach(select => {
            select.selectedIndex = Math.floor(Math.random() * select.options.length);
        });
    }

    getDefinition(hitType, hitLocation, runnerOption, batterSelect, outfieldLayout) {
        const location = this.hitLocations.find(([value]) => value === hitLocation.value);
        const selectedRunners = this.runnerOptions[Number(runnerOption.value)].bases;
        const baseOrder = ['first', 'second', 'third', 'home'];
        const runners = [{ startPos: BASES.home, playerId: batterSelect.value }];
        const runnerPaths = [baseOrder.map(base => BASES[base])];

        selectedRunners.forEach(base => {
            runners.push({ startPos: BASES[base], playerId: null });
            const startIndex = baseOrder.indexOf(base);
            runnerPaths.push(baseOrder.slice(startIndex + 1).map(nextBase => BASES[nextBase]));
        });

        return {
            outfieldPositions: { ...this.engine?.scenario?.outfieldPositions },
            outfieldLayout: outfieldLayout?.value || '3',
            runners,
            hitTarget: { ...location[2] },
            hitType: hitType.value,
            runnerPaths,
        };
    }
}
