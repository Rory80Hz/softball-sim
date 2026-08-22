import { attributeToRealWorld } from './physics.js';
import { BASES, DEFAULT_POSITIONS, PITCHING_PLATE } from '../constants.js';
import { Ball } from './Ball.js';
import { Fielder } from './Fielder.js';
import { Runner } from './Runner.js';

export class SimulationEngine {
    constructor(scene, store) {
        this.scene = scene;
        this.store = store;
        this.state = 'idle'; // idle | playing | paused
        this.scenario = null;
        this.runners = [];
        this.fielders = [];
        this.ball = new Ball(scene);
        this.score = 0;
        this.outs = 0;
        this.pendingThrow = null;
        this.ball.onThrowComplete = this.handleThrowComplete.bind(this);
        this.onEvent = null; // callback for UI events (e.g., ball caught)
    }
    
    loadScenario(scenarioDef) {
       this.scenario = scenarioDef;
       const teams = this.store.getTeams();
       const fieldingTeam = teams[0]; // Assuming home team fields first
       const battingTeam = teams[1];

       // Clear old meshes
       this.fielders.forEach(f => {
           this.scene.remove(f.mesh);
           f.mesh.geometry.dispose();
           f.mesh.material.dispose();
       });
       this.runners.forEach(r => {
           this.scene.remove(r.mesh);
           r.mesh.geometry.dispose();
           r.mesh.material.dispose();
       });

       this.fielders = [];
       this.runners = [];
         this.score = 0;
         this.outs = 0;
         this.pendingThrow = null;

       // Setup fielders
       fieldingTeam.players.forEach(p => {
           const pos = scenarioDef.outfieldPositions?.[p.position] || DEFAULT_POSITIONS[p.position];
           if (pos) {
               const fielder = new Fielder(this.scene, p.position, p);
               fielder.setPosition(pos.x, pos.y);
               fielder.mesh.material.color.setHex(0xff3333);
               this.fielders.push(fielder);
           }
       });

       // Setup runners based on scenario 
       if (scenarioDef.runners && scenarioDef.runners.length > 0) {
           scenarioDef.runners.forEach(rDef => {
               const player = battingTeam.players.find(p => p.id === rDef.playerId) || battingTeam.players[this.runners.length];
               const runner = new Runner(this.scene, player);
               runner.setPosition(rDef.startPos.x, rDef.startPos.y);
               runner.onScore = this.handleRunnerScore.bind(this);
               runner.onOut = this.handleRunnerOut.bind(this);
               this.runners.push(runner);
           });
       } else {
           // Default batter at home
           const batter = battingTeam.players[0]; // Simplification
           const runner = new Runner(this.scene, batter);
           runner.setPosition(BASES.home.x, BASES.home.y);
           runner.onScore = this.handleRunnerScore.bind(this);
           runner.onOut = this.handleRunnerOut.bind(this);
           this.runners.push(runner);
       }
       
       this.ball.hit(0, 0, 0); // Put ball at home
       this.ball.active = false;
       this.state = 'idle';
    }

    startPlay(def) {
       if (def) this.loadScenario(def);
       this.state = 'playing';
       
       // Example logic for hitting the ball to a scenario location
       if(this.scenario?.hitTarget) {
           const batterStats = this.runners.length > 0 ? this.runners[0].player.attributes : null;
           this.ball.hit(this.scenario.hitTarget.x, this.scenario.hitTarget.y, this.scenario.hitType || 'grounder', batterStats);
       }

       // Start runners
       if (this.scenario?.runnerPaths) {
           this.runners.forEach((r, i) => {
               if(this.scenario.runnerPaths[i]) {
                   r.runPath(this.completeRunnerPath(r, [...this.scenario.runnerPaths[i]]));
               }
           });
       }
    }

    pause() {
        this.state = 'paused';
    }

    resume() {
        if(this.state === 'paused') {
            this.state = 'playing';
        }
    }

    update(dt) {
        if(this.state !== 'playing') return;
        
        this.ball.update(dt);
        this.runners.forEach(r => r.update(dt));
        this.updateFielderAI();

        
        this.fielders.forEach(f => f.update(dt));
        if (this.ball.carrier) this.ball.setCarrier(this.ball.carrier);
        
        // Simple check: did a fielder reached the ball?
        // Simple check: did a fielder reached the ball?
        if (this.ball.active && ['hit', 'loose'].includes(this.ball.mode)) {
            const distFromHome = Math.hypot(this.ball.pos.x, this.ball.pos.y);

            for(let f of this.fielders) {
                if(!f.active) continue;
                
                // Prevent catcher from instantly intercepting hits while over the plate
                if (f.positionName === 'C' && distFromHome < 15) continue;

                const fielderZ = 4; // Fielder is at height 4ft

                const distToBall = Math.hypot(f.pos.x - this.ball.pos.x, f.pos.y - this.ball.pos.y, fielderZ - this.ball.pos.z);
                if (distToBall < 4.5) { // 4.5ft realistic reach radius
                    f.mesh.material.color.setHex(0x33ff33);
                    this.handleBallCaught(f);
                    break;
                }
            }
        }
    }

    updateFielderAI() {
        if (!this.ball.active || !this.scenario?.hitTarget) return;

        const target = this.scenario.hitTarget;
        const ballPoint = this.ball.mode === 'loose' ? this.ball.pos : target;
        if (this.ball.mode === 'loose') {
            const nearest = this.fielders
                .filter(f => f.active && !f.manualTarget)
                .sort((a, b) => this.distanceToBall(a) - this.distanceToBall(b))[0];
            if (nearest) nearest.moveTo(this.ball.pos.x, this.ball.pos.y);
            return;
        }

        const inFlight = this.ball.pos.z > 0.5 && this.scenario.hitType !== 'grounder';
        const primary = this.fielders
            .filter(f => f.active && !f.manualTarget && this.isInPlayZone(f.positionName, ballPoint))
            .sort((a, b) => this.fielderTargetScore(a, ballPoint) - this.fielderTargetScore(b, ballPoint))[0]
            || this.fielders
                .filter(f => f.active && !f.manualTarget)
                .sort((a, b) => this.distanceToBall(a) - this.distanceToBall(b))[0];

        this.fielders.forEach(fielder => {
            if (!fielder.active || fielder.manualTarget) return;
            if (fielder === primary) {
                const destination = inFlight ? target : this.ball.pos;
                fielder.moveTo(destination.x, destination.y);
            } else if (this.needsBackup(fielder, ballPoint, primary)) {
                const backup = this.backupTarget(fielder.positionName, ballPoint);
                fielder.moveTo(backup.x, backup.y);
            } else {
                const zone = this.zoneTarget(fielder.positionName);
                fielder.moveTo(zone.x, zone.y);
            }
        });
    }

    fielderTargetScore(fielder, target) {
        const roleBias = {
            C: 70,
            P: 45,
            '1B': target.x < 0 ? 35 : 0,
            '2B': target.x > 0 ? 25 : 0,
            '3B': target.x > 0 ? 0 : 25,
            SS: Math.abs(target.x) < 45 ? 15 : 0,
            LF: target.x < -20 ? -20 : 30,
            LC: target.x < 10 ? -20 : 30,
            CF: Math.abs(target.x) < 35 ? -20 : 25,
            RC: target.x > -10 ? -20 : 30,
            RF: target.x > 20 ? -20 : 30,
            SF: target.y < 130 ? -10 : 35,
        };
        return Math.hypot(fielder.pos.x - target.x, fielder.pos.y - target.y)
            + (roleBias[fielder.positionName] || 0);
    }

    distanceToBall(fielder) {
        return Math.hypot(fielder.pos.x - this.ball.pos.x, fielder.pos.y - this.ball.pos.y);
    }

    zoneTarget(position) {
        if (DEFAULT_POSITIONS[position]) return { ...DEFAULT_POSITIONS[position] };
        return { ...BASES.home };
    }

    isInPlayZone(position, point) {
        const x = point.x;
        const y = point.y;
        switch (position) {
            case 'C': return y < 45;
            case 'P': return y < 115;
            case '1B': return x > 0 && y < 125;
            case '2B': return x > -20 && y > 35 && y < 145;
            case '3B': return x < 0 && y < 125;
            case 'SS': return Math.abs(x) < 45 && y > 35 && y < 145;
            case 'LF': return x < -25 && y > 90;
            case 'LC': return x < 20 && y > 110;
            case 'CF': return Math.abs(x) < 55 && y > 125;
            case 'RC': return x > -20 && y > 110;
            case 'RF': return x > 25 && y > 90;
            case 'SF': return y > 45 && y < 170;
            default: return false;
        }
    }

    needsBackup(fielder, point, primary) {
        if (!primary || ['C', 'P', '1B', '2B', '3B', 'SS'].includes(fielder.positionName)) {
            return false;
        }
        const zone = this.zoneTarget(fielder.positionName);
        return this.isInPlayZone(fielder.positionName, point)
            && Math.hypot(zone.x - point.x, zone.y - point.y) < 110;
    }

    backupTarget(position, point) {
        const zone = this.zoneTarget(position);
        return {
            x: zone.x + (point.x - zone.x) * 0.45,
            y: zone.y + (point.y - zone.y) * 0.45,
        };
    }

    roleTarget(position, hitTarget) {
        const base = BASES;
        const cutoff = (point, amount) => ({
            x: point.x * amount,
            y: point.y * amount,
        });

        switch (position) {
            case 'C': return { ...base.home };
            case 'P': return { ...PITCHING_PLATE };
            case '1B': return { ...base.first };
            case '2B': return { ...base.second };
            case '3B': return { ...base.third };
            case 'SS': return cutoff(base.second, 0.75);
            case 'LF': return hitTarget.x < -20 ? { ...hitTarget } : cutoff(hitTarget, 0.75);
            case 'LC': return hitTarget.x < 15 ? { ...hitTarget } : cutoff(hitTarget, 0.8);
            case 'CF': return Math.abs(hitTarget.x) < 45 ? { ...hitTarget } : cutoff(hitTarget, 0.85);
            case 'RC': return hitTarget.x > -15 ? { ...hitTarget } : cutoff(hitTarget, 0.8);
            case 'RF': return hitTarget.x > 20 ? { ...hitTarget } : cutoff(hitTarget, 0.75);
            case 'SF': return { x: hitTarget.x * 0.45, y: Math.min(hitTarget.y, 125) };
            default: return { ...hitTarget };
        }
    }

    handleBallCaught(fielder) {
        this.ball.active = false;
        this.fielders.forEach(candidate => {
            candidate.hasBall = candidate === fielder;
        });
        this.ball.setCarrier(fielder);
        fielder.mesh.material.color.setHex(0x33ff33);

        if (this.scenario.hitType !== 'grounder' && this.ball.pos.z > 0.5) {
            this.recordOut(this.runners[0], 'caught_fly');
            this.runners.slice(1).forEach(runner => {
                if (runner.active) runner.returnToBase();
            });
            this.state = 'idle';
            return;
        }

        const runner = this.runners
            .filter(candidate => candidate.active && candidate.targetPos)
            .sort((a, b) => this.runnerProgress(b) - this.runnerProgress(a))[0];
        const forced = runner ? this.isForcedPlay(runner) : false;
        const baseName = runner ? runner.baseNameAtPosition(runner.targetPos) : 'home';
        const target = forced ? BASES[baseName] : (runner?.pos || BASES.home);
        const attributes = fielder.player.attributes;
        const throwSpeed = 25 + attributes.throwSpeed * 0.35;
        fielder.hasBall = false;
        this.pendingThrow = { runner, target, forced, baseName, fielder };
        this.ball.throwTo(fielder.pos, target, throwSpeed, attributes.throwAccuracy);
        if (this.onEvent) this.onEvent({ type: 'ball_thrown', fielder, target });
    }

    handleThrowComplete() {
        const pendingThrow = this.pendingThrow;
        this.pendingThrow = null;
        if (!pendingThrow) return;

        const receiver = this.fielders.find(fielder => (
            fielder.active &&
            fielder !== pendingThrow.fielder &&
            Math.hypot(
                fielder.pos.x - pendingThrow.target.x,
                fielder.pos.y - pendingThrow.target.y
            ) <= 4.5
        ));

        if (!receiver) {
            pendingThrow.fielder.hasBall = false;
            this.ball.releaseAt(pendingThrow.target);
            return;
        }

        this.fielders.forEach(fielder => {
            fielder.hasBall = fielder === receiver;
        });
        this.ball.setCarrier(receiver);

        if (pendingThrow.runner?.active) {
            const distance = Math.hypot(
                pendingThrow.runner.pos.x - pendingThrow.target.x,
                pendingThrow.runner.pos.y - pendingThrow.target.y
            );
            const safe = pendingThrow.forced
                ? pendingThrow.runner.hasPassedBase(pendingThrow.baseName)
                : distance > 3;
            if (!safe) {
                receiver.mesh.material.color.setHex(0x33ff33);
                pendingThrow.runner.markOut();
            }
        }

        if (this.outs < 3) {
            this.throwAtNextRunner(receiver);
        }
    }

    throwAtNextRunner(fielder) {
        const runner = this.runners
            .filter(candidate => candidate.active && candidate.targetPos)
            .sort((a, b) => this.runnerProgress(b) - this.runnerProgress(a))[0];
        if (!runner) return;

        const forced = this.isForcedPlay(runner);
        const baseName = runner.baseNameAtPosition(runner.targetPos);
        const target = forced ? BASES[baseName] : runner.pos;
        const attributes = fielder.player.attributes;
        fielder.hasBall = false;
        this.pendingThrow = { runner, target, forced, baseName, fielder };
        this.ball.throwTo(
            fielder.pos,
            target,
            25 + attributes.throwSpeed * 0.35,
            attributes.throwAccuracy
        );
        if (this.onEvent) this.onEvent({ type: 'ball_thrown', fielder, target });
    }

    runnerProgress(runner) {
        const order = ['home', 'first', 'second', 'third'];
        const targetBase = runner.targetPos ? runner.baseNameAtPosition(runner.targetPos) : runner.currentBase;
        return order.indexOf(targetBase);
    }

    isForcedPlay(runner) {
        if (runner.currentBase === 'home') return true;
        return this.runners.some(other => (
            other !== runner && other.active && other.targetPos &&
            other.baseNameAtPosition(other.targetPos) === runner.currentBase
        ));
    }

    completeRunnerPath(runner, path) {
        if (path.length === 0) return path;

        const basePoints = [BASES.first, BASES.second, BASES.third, BASES.home];
        let last = path[path.length - 1];
        let index = basePoints.findIndex(base => base.x === last.x && base.y === last.y);
        while (index >= 0 && index < basePoints.length - 1) {
            index += 1;
            path.push(basePoints[index]);
        }
        return path;
    }

    handleRunnerScore(runner) {
        this.score += 1;
        if (this.onEvent) this.onEvent({ type: 'run_scored', runner, score: this.score });
    }

    handleRunnerOut(runner) {
        this.outs += 1;
        if (this.onEvent) this.onEvent({ type: 'runner_out', runner, outs: this.outs });
    }

    recordOut(runner, reason) {
        if (runner) runner.markOut();
        else {
            this.outs += 1;
            if (this.onEvent) this.onEvent({ type: 'runner_out', reason, outs: this.outs });
        }
    }
}
