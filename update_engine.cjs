const fs = require('fs');

const path = 'src/sim/Engine.js';
let content = fs.readFileSync(path, 'utf8');

const baseContent = `
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
`;

content = content.replace(/\/\/ Setup runners based on scenario[\s\S]*?this\.runners\.push\(runner\);/, baseContent.trim());
fs.writeFileSync(path, content);
