const fs = require('fs');

// 1. BALL.JS
let ball = fs.readFileSync('src/sim/Ball.js', 'utf8');
const newHit = `
    hit(targetX, targetY, hitType = 'grounder', batterStats = null) {
        this.pos = { x: 0, y: 0, z: 3 }; // stat 3 ft high (contact point)
        
        // adding a bit of target randomization based on stats
        // If batter 'catchAccuracy' (using as general skill for now) is 55, variance is higher.
        const skill = batterStats?.catchAccuracy || 55;
        const variance = ((100 - skill) / 100) * 15; // Up to 15 ft random variance off target
        
        const finalX = targetX + (Math.random() * variance * 2 - variance);
        const finalY = targetY + (Math.random() * variance * 2 + variance / 2); // mostly varies further out
        
        const dx = finalX - this.pos.x;
        const dy = finalY - this.pos.y;
        const dist = Math.hypot(dx, dy);

        let t; // flight time
        let speed; // horizontal speed
        
        switch (hitType) {
            case 'pop_up':
                t = 4.0 + Math.random() * 2.0; // 4-6 seconds hang time (huge arc)
                speed = dist / t;
                break;
            case 'flyball':
                t = 3.5 + Math.random() * 1.5; // 3.5-5 seconds hang time
                speed = dist / t;
                break;
            case 'blooper':
                t = 2.5 + Math.random() * 1.0; // 2.5-3.5 seconds
                speed = dist / t;
                break;
            case 'line_drive':
                speed = 100 + Math.random() * 30; // Hard hit horizontally (100-130 ft/s)
                t = dist / speed;
                break;
            case 'grounder':
            default:
                speed = 70 + Math.random() * 30; // 70-100 ft/s
                t = dist / speed;
                break;

        }
        
        this.velocity.x = (dx / dist) * speed;
        this.velocity.y = (dy / dist) * speed;
        
        if (hitType === 'grounder') {
            this.pos.z = 0.5; // bounce/roll immediately
            this.velocity.z = 0;
        } else {
            const g = -32.2; // gravity in ft/s^2
            this.velocity.z = -(this.pos.z + 0.5 * g * t * t) / t;
        }
        
        this.active = true;
        this.mesh.visible = true;
        this.updateMesh();
    }
`;
ball = ball.replace(/hit\(targetX, targetY, speed, type = 'grounder'\) \{[\s\S]*?this\.updateMesh\(\);\n    \}/, newHit.trim());
fs.writeFileSync('src/sim/Ball.js', ball);

// 2. ENGINE.JS
let engine = fs.readFileSync('src/sim/Engine.js', 'utf8');
engine = engine.replace(
    /this\.ball\.hit\(this\.scenario\.hitTarget\.x, this\.scenario\.hitTarget\.y, this\.scenario\.hitSpeed \|\| 80, this\.scenario\.hitType \|\| 'grounder'\);/,
    `const batterStats = this.runners.length > 0 ? this.runners[0].player.attributes : null;
           this.ball.hit(this.scenario.hitTarget.x, this.scenario.hitTarget.y, this.scenario.hitType || 'grounder', batterStats);`
);
fs.writeFileSync('src/sim/Engine.js', engine);

// 3. SCENARIOEDITOR.JS
let ui = fs.readFileSync('src/ui/ScenarioEditor.js', 'utf8');
const scenarios = `
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
`;
ui = ui.replace(/this\.scenarios = \[[^]*?\];/m, scenarios.trim());
fs.writeFileSync('src/ui/ScenarioEditor.js', ui);

