import { attributeToRealWorld } from './physics.js';
import { FIELD, BASES, DEFAULT_POSITIONS } from '../constants.js';
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
               this.runners.push(runner);
           });
       } else {
           // Default batter at home
           const batter = battingTeam.players[0]; // Simplification
           const runner = new Runner(this.scene, batter);
           runner.setPosition(BASES.home.x, BASES.home.y);
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
                   r.runPath([...this.scenario.runnerPaths[i]]);
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
        // Advanced Fielder Tracking: Anticipate hit target vs chase missed rolling ball
        if (this.ball.active) {
            let primaryToTarget = null;
            let minDistToTarget = Infinity;
            this.fielders.forEach(f => {
                if(!f.active) return;
                const d = Math.hypot(f.pos.x - this.scenario.hitTarget.x, f.pos.y - this.scenario.hitTarget.y);
                if(d < minDistToTarget) {
                    minDistToTarget = d;
                    primaryToTarget = f;
                }
            });

            let primaryToBall = null;
            let minDistToBall = Infinity;
            this.fielders.forEach(f => {
                if(!f.active) return;
                const d = Math.hypot(f.pos.x - this.ball.pos.x, f.pos.y - this.ball.pos.y);
                if(d < minDistToBall) {
                    minDistToBall = d;
                    primaryToBall = f;
                }
            });

            const outfielders = ['LF', 'LC', 'CF', 'RC', 'RF', 'SF'];

            this.fielders.forEach(f => {
                if (!f.active) return;
                
                // Allow manual override (if the user clicks a location in the future)
                if (f.manualTarget) {
                    f.moveTo(f.manualTarget.x, f.manualTarget.y);
                    return;
                }

                // If in flight, anticipate landing spot. If on ground, chase current ball pos.
                const inFlight = this.ball.pos.z > 0.5 && this.scenario.hitType !== 'grounder';

                if (inFlight) {
                    if (f === primaryToTarget) {
                        f.moveTo(this.scenario.hitTarget.x, this.scenario.hitTarget.y);
                    } else if (outfielders.includes(f.positionName)) {
                        const dToTarget = Math.hypot(f.pos.x - this.scenario.hitTarget.x, f.pos.y - this.scenario.hitTarget.y);
                        if (dToTarget > 40) {
                            f.moveTo(this.scenario.hitTarget.x, this.scenario.hitTarget.y);
                        } else {
                            f.targetPos = null;
                        }
                    } else {
                        f.targetPos = null;
                    }
                } else {
                    if (f === primaryToBall) {
                        f.moveTo(this.ball.pos.x, this.ball.pos.y);
                    } else if (outfielders.includes(f.positionName)) {
                        const dToBall = Math.hypot(f.pos.x - this.ball.pos.x, f.pos.y - this.ball.pos.y);
                        if (dToBall > 40) {
                            f.moveTo(this.ball.pos.x, this.ball.pos.y);
                        } else {
                            f.targetPos = null; // Backup
                        }
                    } else {
                        f.targetPos = null; 
                    }
                }
            });
        }

        
        this.fielders.forEach(f => f.update(dt));
        
        // Simple check: did a fielder reached the ball?
        // Simple check: did a fielder reached the ball?
        if (this.ball.active) {
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

    handleBallCaught(fielder) {
        this.pause();
        this.ball.active = false;
        if(this.onEvent) {
            // Calculate catch probability based on stats (simplified)
            const speedFactor = this.ball.velocity.x * this.ball.velocity.x + this.ball.velocity.y * this.ball.velocity.y;
            const catchChance = fielder.player.attributes.catchAccuracy / 100;
            // if Math.random() < catchChance... 
            
            this.onEvent({
                type: 'ball_caught',
                fielder: fielder
            });
        }
    }
}
