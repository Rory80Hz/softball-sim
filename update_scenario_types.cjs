const fs = require('fs');
let code = fs.readFileSync('src/ui/ScenarioEditor.js', 'utf8');

// Speed up ball and add flyball/linedrive metadata to the test scenarios
code = code.replace(
    /hitSpeed: 60,/g,
    'hitSpeed: 100,\n                    hitType: "flyball",'
);
code = code.replace(
    /hitSpeed: 70,/g,
    'hitSpeed: 120,\n                    hitType: "line_drive",'
);

// We need to support casting a shadow for depth perception.
fs.writeFileSync('src/ui/ScenarioEditor.js', code);
