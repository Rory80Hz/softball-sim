import { attributeToRealWorld } from './physics.js';
import { BASES, DEFAULT_POSITIONS, FIELD, PITCHING_PLATE } from '../constants.js';
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
        this.pendingTag = null;
        this.ball.onThrowComplete = this.handleThrowComplete.bind(this);
        this.ball.onDead = () => this.isBallDead();
        this.onEvent = null; // callback for UI events (e.g., ball caught)
    }
    
    loadScenario(scenarioDef) {
       this.scenario = scenarioDef;
       const teams = this.store.getTeams();
       const fieldingTeam = teams[0]; // Assuming home team fields first
       const battingTeam = teams[1];
       const configuredBatterId = scenarioDef.runners?.[0]?.playerId;
       const batter = battingTeam.players.find(player => player.id === configuredBatterId)
           || battingTeam.players[Math.floor(Math.random() * battingTeam.players.length)];

       // Clear old meshes
       this.fielders.forEach(f => {
           this.scene.remove(f.mesh);
           this.scene.remove(f.label);
           f.mesh.geometry.dispose();
           f.mesh.material.dispose();
           f.label.material.map.dispose();
           f.label.material.dispose();
       });
       this.runners.forEach(r => {
           this.scene.remove(r.mesh);
           this.scene.remove(r.label);
           r.mesh.geometry.dispose();
           r.mesh.material.dispose();
           r.label.material.map.dispose();
           r.label.material.dispose();
       });

       this.fielders = [];
       this.runners = [];
         this.score = 0;
         this.outs = 0;
         this.pendingThrow = null;
        this.pendingTag = null;

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
               const configuredPlayer = battingTeam.players.find(p => p.id === rDef.playerId);
               const availablePlayers = battingTeam.players.filter(p => p.id !== batter.id && !this.runners.some(runner => runner.player.id === p.id));
               const player = configuredPlayer || (this.runners.length === 0 ? batter : availablePlayers[0]);
               const runner = new Runner(this.scene, player, this.runners.length === 0 ? 'batter' : 'runner');
               runner.setPosition(rDef.startPos.x, rDef.startPos.y);
               runner.onScore = this.handleRunnerScore.bind(this);
               runner.onOut = this.handleRunnerOut.bind(this);
               runner.onBaseReached = this.handleBaseReached.bind(this);
               this.runners.push(runner);
           });
       } else {
           // Default batter at home
           const runner = new Runner(this.scene, batter, 'batter');
           runner.setPosition(BASES.home.x, BASES.home.y);
           runner.onScore = this.handleRunnerScore.bind(this);
           runner.onOut = this.handleRunnerOut.bind(this);
           runner.onBaseReached = this.handleBaseReached.bind(this);
           this.runners.push(runner);
       }
       
    this.ball.hit(0, 0, 'grounder'); // Put ball at home
       this.ball.active = false;
       this.state = 'idle';
    }

    startPlay(def) {
       if (def) this.loadScenario(def);
       this.state = 'playing';
       if (this.onEvent) this.onEvent({
           type: 'play_started',
           hitType: this.scenario?.hitType,
           target: this.scenario?.hitTarget,
       });
       
       // Example logic for hitting the ball to a scenario location
       if(this.scenario?.hitTarget) {
           const batterStats = this.runners.find(runner => runner.role === 'batter')?.player.attributes;
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

    // --- Manual direction (used while paused) ---

    directFielder(fielder, point) {
        if (!fielder?.active || fielder.hasBall) return false;
        fielder.manualTarget = true;
        fielder.manualChase = false;
        fielder.isCaller = false;
        fielder.moveTo(point.x, point.y);
        if (this.onEvent) this.onEvent({ type: 'manual_move', fielder, target: point });
        return true;
    }

    directFielderToBall(fielder) {
        if (!fielder?.active || fielder.hasBall || !this.ball.active) return false;
        fielder.manualTarget = true;
        fielder.manualChase = true;
        if (this.onEvent) this.onEvent({ type: 'manual_chase', fielder });
        return true;
    }

    directThrow(fielder, receiver) {
        if (!fielder?.active || !fielder.hasBall || !receiver?.active || receiver === fielder) return false;
        const attributes = fielder.player.attributes;
        const target = { x: receiver.pos.x, y: receiver.pos.y };
        receiver.manualTarget = true;
        receiver.manualChase = false;
        receiver.targetPos = null;
        fielder.manualTarget = true;
        fielder.hasBall = false;
        this.pendingTag = null;
        this.pendingThrow = {
            runner: null,
            target,
            forced: false,
            playType: 'manual',
            baseName: null,
            fielder,
            receiver,
        };
        this.ball.throwTo(
            fielder.pos,
            target,
            this.throwSpeed(attributes),
            attributes.throwAccuracy,
            this.throwRange(attributes),
            5 + (100 - (Number(attributes.throwingTechnique) || 1)) * 0.08
        );
        if (this.onEvent) this.onEvent({ type: 'manual_throw', fielder, receiver });
        return true;
    }

    validRunnerBases(runner) {
        if (!runner?.active || runner.isOut) return [];
        const order = ['home', 'first', 'second', 'third', 'home'];
        const from = order.indexOf(runner.currentBase || 'home');
        const valid = order.slice(from + 1);
        const onBase = runner.baseNameAtPosition(runner.pos);
        if (!onBase && runner.currentBase) valid.unshift(runner.currentBase);
        return [...new Set(valid)];
    }

    directRunner(runner, baseName) {
        if (!this.validRunnerBases(runner).includes(baseName)) return false;
        const order = ['home', 'first', 'second', 'third', 'home'];
        runner.manual = true;
        const from = order.indexOf(runner.currentBase || 'home');
        const onBase = runner.baseNameAtPosition(runner.pos);
        if (baseName === runner.currentBase && !onBase) {
            runner.returnToBase();
        } else {
            const points = order.slice(from + 1, order.lastIndexOf(baseName, 4) + 1)
                .map(name => BASES[name]);
            runner.isReturning = false;
            runner.runPath(points);
        }
        if (this.onEvent) this.onEvent({ type: 'manual_run', runner, baseName });
        return true;
    }

    updateManualFielders() {
        this.fielders.forEach(fielder => {
            if (!fielder.active || !fielder.manualChase || fielder.hasBall) return;
            if (!this.ball.active || !['hit', 'loose'].includes(this.ball.mode)) return;
            const inFlight = this.ball.pos.z > 0.5 && this.scenario?.hitType !== 'grounder';
            const point = inFlight ? this.projectedLandingPoint() : this.ball.pos;
            fielder.moveTo(point.x, point.y);
        });
    }

    // Hands players back to the AI once their manual order is finished.
    releaseFinishedManualOrders() {
        const throwing = this.pendingThrow?.playType === 'manual' ? this.pendingThrow : null;
        this.fielders.forEach(f => {
            if (!f.manualTarget) return;
            const inThrow = throwing && (throwing.fielder === f || throwing.receiver === f);
            const chasing = f.manualChase && this.ball.active && ['hit', 'loose'].includes(this.ball.mode);
            if (inThrow || chasing || f.hasBall) return;
            if (f.manualChase || !f.targetPos) {
                f.manualTarget = false;
                f.manualChase = false;
            }
        });
        this.runners.forEach(r => {
            if (r.manual && (!r.active || !r.targetPos)) r.manual = false;
        });
    }

    endPlay() {
        this.state = 'idle';
        this.pendingThrow = null;
        this.pendingTag = null;
        this.runners.forEach(runner => {
            if (runner.active) runner.settleAtSafeBase();
        });
        this.fielders.forEach(fielder => {
            const configuredPosition = this.scenario?.outfieldPositions?.[fielder.positionName]
                || DEFAULT_POSITIONS[fielder.positionName];
            if (configuredPosition) fielder.setPosition(configuredPosition.x, configuredPosition.y);
            fielder.hasBall = false;
            fielder.isCaller = false;
            fielder.mesh.material.color.setHex(0xff3333);
        });
        this.ball.active = false;
        this.ball.carrier = null;
        this.ball.mode = 'idle';
        this.ball.mesh.visible = false;
        if (this.onEvent) this.onEvent({ type: 'play_stopped', reason: 'time_called' });
    }

    update(dt) {
        if(this.state !== 'playing') {
            if (this.state === 'idle') {
                this.runners.forEach(runner => runner.updateWalkOff(dt));
            }
            return;
        }
        
        this.ball.update(dt);
        this.runners.forEach(r => r.update(dt));
        this.updateManualFielders();
        this.releaseFinishedManualOrders();
        this.updateFielderAI();

        
        this.fielders.forEach(f => {
            if (f.missTimer > 0) f.missTimer -= dt;
            f.update(dt);
        });
        if (this.ball.carrier) this.ball.setCarrier(this.ball.carrier);
        this.updateTagging();

        // Simple check: did a fielder reach the ball?
        if (this.ball.active && ['hit', 'loose'].includes(this.ball.mode)) {
            const distFromHome = Math.hypot(this.ball.pos.x, this.ball.pos.y);

            for(let f of this.fielders) {
                if(!f.active) continue;
                if (!f.isCaller && !f.manualTarget) continue;
                
                // Prevent catcher from instantly intercepting hits while over the plate
                if (f.positionName === 'C' && this.scenario.hitType === 'grounder' && distFromHome < 15) continue;

                const fielderZ = 4; // Fielder is at height 4ft

                const distToBall = Math.hypot(f.pos.x - this.ball.pos.x, f.pos.y - this.ball.pos.y, fielderZ - this.ball.pos.z);
                if (f.missedBall && (distToBall >= 4.5 || f.missTimer <= 0)) f.missedBall = false;
                if (distToBall < 4.5) { // 4.5ft realistic reach radius
                    // One attempt per pass: a fielder who missed can't re-roll while the ball is still in reach.
                    if (f.missedBall) continue;
                    const catchAcc = Number(f.player?.attributes?.catchAccuracy) || 55;
                    const ballSpeed = Math.hypot(this.ball.velocity.x, this.ball.velocity.y, this.ball.velocity.z);
                    const airborne = this.ball.pos.z > 2;
                    // Airborne balls are easier than grounders but still depend on skill and ball speed.
                    const catchProb = airborne
                        ? Math.max(0.4, Math.min(0.97, 0.6 + (catchAcc / 100) * 0.35 - ballSpeed / 400))
                        : Math.max(0.2, Math.min(0.99, (catchAcc / 100) * 0.95 + 0.1 - (ballSpeed / 200)));
                    if (Math.random() < catchProb) {
                        f.mesh.material.color.setHex(0x33ff33);
                        // A directed fielder who gets the ball is done with the order; the AI takes over.
                        f.manualTarget = false;
                        f.manualChase = false;
                        this.handleBallCaught(f);
                    } else {
                        // Missed ground ball: it skips past along the ground
                        this.ball.velocity.x *= 0.6;
                        this.ball.velocity.y *= 0.6;
                        this.ball.velocity.z = 0;
                        this.ball.pos.z = Math.min(this.ball.pos.z, 0.5);
                        f.missedBall = true;
                        f.missTimer = 0.4;
                        if (this.onEvent) this.onEvent({ type: 'ball_bobbled', fielder: f });
                    }
                    break;
                }
            }
        }

        // Check if play has settled: ball held and no runners in motion
        this.checkPlaySettled();
    }

    checkPlaySettled() {
        if (this.ball.mode === 'held' && !this.pendingThrow && !this.pendingTag) {
            const runnersActiveMoving = this.runners.some(r => r.active && r.targetPos);
            if (!runnersActiveMoving && this.state === 'playing') {
                this.state = 'idle';
                if (this.onEvent) this.onEvent({ type: 'play_stopped', reason: 'play_settled' });
            }
        }
    }

    updateFielderAI() {
        if (!this.scenario?.hitTarget) return;

        if (this.ball.mode === 'held' && this.ball.carrier) {
            this.fielders.forEach(fielder => {
                if (!fielder.active || fielder === this.ball.carrier || fielder.manualTarget) return;
                const base = this.baseCoverageTarget(fielder.positionName);
                const destination = base || this.zoneTarget(fielder.positionName);
                fielder.moveTo(destination.x, destination.y);
                fielder.isCaller = false;
            });
            return;
        }

        if (!this.ball.active) return;

        const target = this.scenario.hitTarget;
        const inFlight = this.ball.pos.z > 0.5 && this.scenario.hitType !== 'grounder';
        const ballPoint = inFlight ? this.projectedLandingPoint() : this.ball.pos;
        if (this.ball.mode === 'loose') {
            const available = this.fielders.filter(f => f.active && !f.manualTarget);
            const nearest = available
                .filter(f => f.active && !f.manualTarget)
                .sort((a, b) => this.distanceToBall(a) - this.distanceToBall(b))[0];
            available.forEach(fielder => {
                fielder.isCaller = fielder === nearest;
                if (fielder === nearest) {
                    fielder.moveTo(this.ball.pos.x, this.ball.pos.y);
                } else if (this.isOutfielder(fielder.positionName)) {
                    const backup = this.backupTarget(fielder.positionName, this.ball.pos);
                    fielder.moveTo(backup.x, backup.y);
                } else {
                    const base = this.baseCoverageTarget(fielder.positionName);
                    if (base) fielder.moveTo(base.x, base.y);
                }
            });
            return;
        }

        if (this.ball.mode === 'throw') {
            const available = this.fielders.filter(f => f.active && !f.manualTarget);
            const receiver = this.selectThrowReceiver(this.pendingThrow, available);
            available.forEach(fielder => {
                fielder.isCaller = fielder === receiver;
                if (fielder === receiver) {
                    fielder.moveTo(this.ball.throwTarget.x, this.ball.throwTarget.y);
                } else if (this.isOutfielder(fielder.positionName)) {
                    const cutoff = this.throwCutoffTarget(fielder.positionName);
                    fielder.moveTo(cutoff.x, cutoff.y);
                } else {
                    const base = this.baseCoverageTarget(fielder.positionName);
                    if (base) fielder.moveTo(base.x, base.y);
                }
            });
            return;
        }

        const available = this.fielders.filter(f => f.active && !f.manualTarget);
        const primary = available
            .map(fielder => ({ fielder, eta: this.timeToBall(fielder, ballPoint) }))
            .sort((a, b) => a.eta - b.eta)[0]?.fielder;
            const outfieldBackup = !inFlight && primary && !this.isOutfielder(primary.positionName)
            ? available
                .filter(f => this.isOutfielder(f.positionName) && f !== primary)
                .sort((a, b) => this.timeToBall(a, this.ball.pos) - this.timeToBall(b, this.ball.pos))[0]
            : null;

        this.fielders.forEach(fielder => {
            const wasCaller = fielder.isCaller;
            fielder.isCaller = fielder === primary;
            if (!wasCaller && fielder.isCaller && this.onEvent) {
                this.onEvent({ type: 'fielder_call', fielder, target: ballPoint });
            }
        });

        this.fielders.forEach(fielder => {
            if (!fielder.active || fielder.manualTarget) return;
            if (fielder === primary) {
                const destination = inFlight ? ballPoint : this.ball.pos;
                fielder.moveTo(destination.x, destination.y);
            } else if (fielder === outfieldBackup) {
                fielder.moveTo(this.ball.pos.x, this.ball.pos.y);
            } else if (this.baseCoverageTarget(fielder.positionName)) {
                const base = this.baseCoverageTarget(fielder.positionName);
                fielder.moveTo(base.x, base.y);
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

    timeToBall(fielder, point) {
        return Math.hypot(fielder.pos.x - point.x, fielder.pos.y - point.y) / fielder.moveSpeed;
    }

    projectedLandingPoint() {
        const gravity = 32.2;
        const verticalSpeed = this.ball.velocity.z;
        const height = Math.max(this.ball.pos.z, 0);
        const flightTime = verticalSpeed > 0
            ? (verticalSpeed + Math.sqrt(verticalSpeed ** 2 + 2 * gravity * height)) / gravity
            : 0;
        return {
            x: this.ball.pos.x + this.ball.velocity.x * flightTime,
            y: this.ball.pos.y + this.ball.velocity.y * flightTime,
        };
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
        if (!primary || fielder === primary || !this.isOutfielder(fielder.positionName)) {
            return false;
        }
        const zone = this.zoneTarget(fielder.positionName);
        const backup = this.backupTarget(fielder.positionName, point);
        return Math.hypot(fielder.pos.x - backup.x, fielder.pos.y - backup.y) > 5;
    }

    isOutfielder(position) {
        return ['LF', 'LC', 'CF', 'RC', 'RF', 'SF'].includes(position);
    }

    baseCoverageTarget(position) {
        const hitX = this.ball?.pos?.x ?? this.scenario?.hitTarget?.x ?? 0;
        // In slowpitch softball, 2B and SS divide 2nd base coverage based on hit direction:
        // SS covers 2B on hits to the right side (hitX > 0), 2B covers 2B on hits to the left/center (hitX <= 0)
        let secondBaseCoverer = hitX > 0 ? 'SS' : '2B';

        const assignments = {
            '1B': 'first',
            '2B': secondBaseCoverer === '2B' ? 'second' : null,
            SS: secondBaseCoverer === 'SS' ? 'second' : null,
            '3B': 'third',
            C: 'home',
            P: 'home', // Pitcher can back up home if needed
        };
        const baseName = assignments[position];
        if (!baseName || !this.runnerNeedsBase(baseName)) return null;
        return { ...BASES[baseName] };
    }

    runnerNeedsBase(baseName) {
        return this.runners.some(runner => (
            runner.active && runner.targetPos &&
            runner.baseNameAtPosition(runner.targetPos) === baseName
        ));
    }

    backupTarget(position, point) {
        const zone = this.zoneTarget(position);
        const sideBias = {
            LF: -18,
            LC: -9,
            CF: 0,
            RC: 9,
            RF: 18,
            SF: 0,
        }[position] || 0;
        return {
            x: zone.x + (point.x - zone.x) * 0.35 + sideBias,
            y: zone.y + (point.y - zone.y) * 0.35,
        };
    }

    throwCutoffTarget(position) {
        const start = this.ball.throwStart || this.ball.pos;
        const target = this.ball.throwTarget || this.ball.pos;
        const fraction = {
            LF: 0.45,
            LC: 0.55,
            CF: 0.65,
            RC: 0.55,
            RF: 0.45,
            SF: 0.5,
        }[position] || 0.5;
        return {
            x: start.x + (target.x - start.x) * fraction,
            y: start.y + (target.y - start.y) * fraction,
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
        fielder.targetPos = null;
        fielder.canMoveWithBall = false;
        this.fielders.forEach(candidate => {
            candidate.hasBall = candidate === fielder;
        });
        this.ball.setCarrier(fielder);
        fielder.canMoveWithBall = true;
        fielder.mesh.material.color.setHex(0x33ff33);
        if (this.onEvent) this.onEvent({ type: 'ball_collected', fielder });

        if (this.scenario?.hitType !== 'grounder' && !this.ball.hasLanded) {
            const batter = this.runners.find(r => r.role === 'batter') || this.runners[0];
            this.recordOut(batter, 'caught_fly');
            this.runners.filter(r => r !== batter && r.active).forEach(runner => {
                runner.returnToBase();
            });
        }

        if (fielder.manualTarget) return;

        const play = this.selectDefensivePlay(fielder);
        const runner = play?.runner;
        const forced = play?.forced || false;
        const baseName = play?.baseName || 'home';
        if (runner && (this.isWellPositionedForTag(fielder, runner) || runner.isReturning)) {
            this.pendingTag = { runner, fielder, baseName };
            this.pendingThrow = null;
            fielder.moveTo(runner.pos.x, runner.pos.y);
            if (this.onEvent) this.onEvent({ type: 'tag_attempt', fielder, runner });
            return;
        }

        if (!play) {
            // No active runners advancing, fielder holds the ball
            return;
        }

        const target = play?.target || BASES.home;
        const attributes = fielder.player.attributes;
        const throwSpeed = this.throwSpeed(attributes);
        const throwArc = 5 + (100 - (Number(attributes.throwingTechnique) || 1)) * 0.08;
        fielder.hasBall = false;
        this.pendingThrow = {
            runner,
            target,
            forced,
            playType: forced ? 'force' : 'hold',
            baseName,
            fielder,
        };
        this.ball.throwTo(fielder.pos, target, throwSpeed, attributes.throwAccuracy, this.throwRange(attributes), throwArc);
        if (this.onEvent) this.onEvent({ type: 'ball_thrown', fielder, target, playType: forced ? 'force' : 'hold' });
    }

    handleThrowComplete() {
        const pendingThrow = this.pendingThrow;
        this.pendingThrow = null;
        if (!pendingThrow) return;

        if (this.ball.throwMissed) {
            pendingThrow.fielder.hasBall = false;
            this.ball.releaseAt(this.ball.throwTarget || pendingThrow.target);
            this.ball.velocity = this.throwMissVelocity(pendingThrow.fielder, pendingThrow.target);
            return;
        }

        const receiver = this.findBaseReceiver(pendingThrow);

        if (!receiver) {
            pendingThrow.fielder.hasBall = false;
            this.ball.releaseAt(this.ball.throwTarget || pendingThrow.target);
            this.ball.velocity = this.throwMissVelocity(pendingThrow.fielder, pendingThrow.target);
            return;
        }

        this.fielders.forEach(fielder => {
            fielder.hasBall = fielder === receiver;
            fielder.canMoveWithBall = false;
        });
        // The receiver stops dead on the catch; a stale destination would carry them off with the ball.
        receiver.targetPos = null;
        this.ball.setCarrier(receiver);

        if (pendingThrow.playType === 'manual') {
            receiver.mesh.material.color.setHex(0x33ff33);
            if (this.onEvent) this.onEvent({ type: 'ball_collected', fielder: receiver });
            pendingThrow.fielder.manualTarget = false;
            receiver.manualTarget = false;
            receiver.manualChase = false;
            if (this.outs < 3) this.throwAtNextRunner(receiver);
            return;
        }

        if (pendingThrow.runner?.active && pendingThrow.playType === 'force') {
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
            } else {
                // Runner reached the forced base safely!
                receiver.mesh.material.color.setHex(0x33ff33);
            }
        } else if (pendingThrow.runner?.active && pendingThrow.playType === 'hold'
            && !pendingThrow.runner.hasPassedBase(pendingThrow.baseName)) {
            pendingThrow.runner.returnToNamedBase(pendingThrow.baseName);
            this.pendingTag = {
                runner: pendingThrow.runner,
                fielder: receiver,
                baseName: pendingThrow.baseName,
            };
            receiver.canMoveWithBall = true;
            if (this.onEvent) this.onEvent({ type: 'tag_attempt', fielder: receiver, runner: pendingThrow.runner });
            return;
        }

        if (this.outs < 3) {
            this.throwAtNextRunner(receiver);
        }
    }

    stopWithBall(fielder) {
        if (!fielder.hasBall) return;
        fielder.targetPos = null;
        fielder.canMoveWithBall = false;
    }

    updateTagging() {
        if (!this.pendingTag) return;

        const { runner, fielder } = this.pendingTag;
        if (!runner.active || !fielder.active || !fielder.hasBall) {
            this.pendingTag = null;
            this.stopWithBall(fielder);
            return;
        }

        fielder.moveTo(runner.pos.x, runner.pos.y, true);
        const targetBase = runner.targetPos ? runner.baseNameAtPosition(runner.targetPos) : null;
        if (!targetBase && runner.currentBase === this.pendingTag.baseName) {
            this.pendingTag = null;
            this.stopWithBall(fielder);
            return;
        }
        if (Math.hypot(fielder.pos.x - runner.pos.x, fielder.pos.y - runner.pos.y) <= 4.5) {
            this.pendingTag = null;
            this.stopWithBall(fielder);
            fielder.mesh.material.color.setHex(0x33ff33);
            runner.markOut();
            if (this.outs < 3) this.throwAtNextRunner(fielder);
        }
    }

    throwAtNextRunner(fielder) {
        const play = this.selectDefensivePlay(fielder);
        if (!play) return;

        const { runner, forced, baseName, target } = play;
        const attributes = fielder.player.attributes;
        fielder.hasBall = false;
        this.pendingThrow = {
            runner,
            target,
            forced,
            playType: forced ? 'force' : 'hold',
            baseName,
            fielder,
        };
        this.ball.throwTo(
            fielder.pos,
            target,
            this.throwSpeed(attributes),
            attributes.throwAccuracy,
            this.throwRange(attributes),
            5 + (100 - (Number(attributes.throwingTechnique) || 1)) * 0.08
        );
        if (this.onEvent) this.onEvent({ type: 'ball_thrown', fielder, target, playType: forced ? 'force' : 'hold' });
    }

    // Receivers must be within reach of where the ball actually lands, so an
    // inaccurate throw can sail past them even when it was aimed correctly.
    findBaseReceiver(pendingThrow) {
        const landing = this.ball.throwTarget || pendingThrow.target;
        const withinReach = r => Math.hypot(r.pos.x - landing.x, r.pos.y - landing.y) <= 4.5;
        if (pendingThrow.receiver) {
            return pendingThrow.receiver.active && withinReach(pendingThrow.receiver) ? pendingThrow.receiver : null;
        }
        const candidates = this.fielders.filter(fielder => (
            fielder.active && fielder !== pendingThrow.fielder && this.isInfielder(fielder.positionName)
        ));
        return candidates
            .filter(withinReach)
            .sort((a, b) => this.timeToBall(a, landing) - this.timeToBall(b, landing))[0] || null;
    }

    selectThrowReceiver(pendingThrow, candidates) {
        return candidates
            .filter(fielder => this.isInfielder(fielder.positionName))
            .sort((a, b) => (
                this.timeToBall(a, pendingThrow.target) - this.timeToBall(b, pendingThrow.target)
            ))[0] || null;
    }

    isInfielder(position) {
        return ['P', 'C', '1B', '2B', '3B', 'SS'].includes(position);
    }

    selectDefensivePlay(fielder) {
        return this.runners
            .filter(runner => runner.active && runner.targetPos)
            .map(runner => {
                const baseName = runner.baseNameAtPosition(runner.targetPos);
                const forced = this.isForcedPlay(runner);
                const target = BASES[baseName] || BASES.home;
                const distance = forced
                    ? Math.hypot(fielder.pos.x - target.x, fielder.pos.y - target.y)
                    : Math.hypot(fielder.pos.x - runner.pos.x, fielder.pos.y - runner.pos.y);
                const runnerSpeed = runner.moveSpeed || 1;
                const urgency = this.runnerProgress(runner) * 20;
                const forceBonus = forced ? 25 : 0;
                return { runner, baseName, forced, target, score: urgency + forceBonus - distance - runnerSpeed * 0.5 };
            })
            .sort((a, b) => b.score - a.score)[0];
    }

    handleBaseReached(runner, baseName) {
        if (runner.manual || baseName === 'home' || !runner.active || !runner.path.length) return;

        const nextBase = runner.baseNameAtPosition(runner.path[0]);
        const fielder = this.fielders
            .filter(candidate => candidate.active)
            .sort((a, b) => this.timeToBase(a, nextBase) - this.timeToBase(b, nextBase))[0];
        const runnerTime = Math.hypot(
            runner.pos.x - BASES[nextBase].x,
            runner.pos.y - BASES[nextBase].y
        ) / runner.moveSpeed;
        const defensiveTime = fielder ? this.timeToBase(fielder, nextBase) : Infinity;

        if (this.ball.mode === 'held' || this.ball.mode === 'throw') {
            const thrower = this.ball.carrier || fielder;
            const throwTime = this.ball.mode === 'held'
                ? 0
                : this.ball.throwRemaining / Math.max(this.throwSpeed(thrower?.player.attributes || {}), 1);
            if (defensiveTime + throwTime < runnerTime + 0.25) {
                runner.path = [];
                runner.targetPos = null;
                if (this.onEvent) this.onEvent({ type: 'runner_held', runner, baseName });
            }
        }
    }

    timeToBase(fielder, baseName) {
        const base = BASES[baseName];
        if (!base) return Infinity;
        return Math.hypot(fielder.pos.x - base.x, fielder.pos.y - base.y) / fielder.moveSpeed;
    }

    runnerProgress(runner) {
        const order = ['home', 'first', 'second', 'third'];
        const targetBase = runner.targetPos ? runner.baseNameAtPosition(runner.targetPos) : runner.currentBase;
        return order.indexOf(targetBase);
    }

    isForcedPlay(runner) {
        if (runner.role === 'batter') return true;
        if (runner.currentBase === 'home') return true;
        return this.runners.some(other => (
            other !== runner && other.active && other.targetPos &&
            (other.baseNameAtPosition(other.targetPos) === runner.currentBase ||
             (other.role === 'batter' && runner.currentBase === 'first'))
        ));
    }

    throwRange(attributes) {
        const armStrength = Number(attributes.armStrength) || 1;
        const technique = Number(attributes.throwingTechnique) || 1;
        const armRange = 35 + armStrength * 1.1;
        const speedFactor = 0.82 + technique / 550;
        return armRange * speedFactor;
    }

    throwSpeed(attributes) {
        const technique = Number(attributes.throwingTechnique) || 1;
        return 35 + technique * 0.45;
    }

    throwMissVelocity(fielder, target) {
        const distance = Math.hypot(target.x - fielder.pos.x, target.y - fielder.pos.y) || 1;
        const speed = this.throwSpeed(fielder.player.attributes);
        return {
            x: ((target.x - fielder.pos.x) / distance) * speed,
            y: ((target.y - fielder.pos.y) / distance) * speed,
            z: 0,
        };
    }

    isBallDead() {
        const margin = 0;
        const dead = Math.abs(this.ball.pos.x) > FIELD.fenceDistance * Math.SQRT1_2 + 60
            || this.ball.pos.y < -60
            || this.ball.pos.y > FIELD.fenceDistance + 60;
        if (!dead) return false;

        this.ball.active = false;
        this.ball.mode = 'dead';
        this.advanceRunnersOneBase();
        if (this.onEvent) this.onEvent({ type: 'ball_dead' });
        return true;
    }

    advanceRunnersOneBase() {
        const order = ['home', 'first', 'second', 'third'];
        this.runners.forEach(runner => {
            if (!runner.active || runner.hasScored) return;
            const currentIndex = Math.max(0, order.indexOf(runner.currentBase));
            const nextBase = order[Math.min(order.length - 1, currentIndex + 1)];
            if (nextBase === 'home') {
                runner.pos = { ...BASES.home };
                runner.currentBase = 'home';
                runner.hasScored = true;
                this.handleRunnerScore(runner);
            } else {
                runner.pos = { ...BASES[nextBase] };
                runner.currentBase = nextBase;
                runner.lastSafePosition = { ...runner.pos };
                runner.passedBases.add(nextBase);
                runner.targetPos = null;
                runner.path = [];
                runner.updateMesh();
            }
        });
    }

    isWellPositionedForTag(fielder, runner) {
        return Math.hypot(
            fielder.pos.x - runner.pos.x,
            fielder.pos.y - runner.pos.y
        ) <= 18;
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
        if (this.runners.length > 0 && this.runners.every(candidate => candidate.status === 'out')) {
            this.state = 'idle';
            if (this.onEvent) this.onEvent({ type: 'play_stopped', reason: 'all_runners_out' });
        }
    }

    recordOut(runner, reason) {
        if (runner) runner.markOut();
        else {
            this.outs += 1;
            if (this.onEvent) this.onEvent({ type: 'runner_out', reason, outs: this.outs });
        }
    }
}
