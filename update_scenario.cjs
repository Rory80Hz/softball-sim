const fs = require('fs');

const path = 'src/ui/ScenarioEditor.js';
let content = fs.readFileSync(path, 'utf8');

const baseContent = `
        this.el.querySelector('#btn-start').addEventListener('click', () => {
             const def = {
                 outfieldPositions: {
                     // Force some fielders back/closer based on scenario
                     'LF': { x: -60, y: 160 },
                     'CF': { x: 0, y: 200 },
                     'RF': { x: 60, y: 160 }
                 },
                 runners: [
                     { startPos: BASES.home, playerId: null }, // Batter
                     { startPos: BASES.second, playerId: null } // Runner on 2nd
                 ],
                 hitTarget: { x: -40, y: 150 }, // Hit to LF
                 hitSpeed: 60,
                 runnerPaths: [
                     [BASES.first, BASES.second], // Batter runs to 1st then 2nd
                     [BASES.third, BASES.home]    // Runner on 2nd runs to 3rd then home
                 ]
             };
             this.engine.startPlay(def);
        });
`;

content = content.replace(/this\.el\.querySelector\('#btn-start'\)\.addEventListener\('click', \(\) => \{[\s\S]*?\}\);/, baseContent.trim());
fs.writeFileSync(path, content);
