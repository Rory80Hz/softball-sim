const fs = require('fs');
let code = fs.readFileSync('src/ui/ScenarioEditor.js', 'utf8');

const gizmoHtml = `
            <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
                <label>Camera Controls</label>
                <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 5px;">
                    <button class="btn" id="btn-cam-top">Top View</button>
                    <button class="btn" id="btn-cam-3d">3D View (Home)</button>
                </div>
            </div>
            
        \`;
        this.container.appendChild(this.el);
`;

code = code.replace(
    /        `;\n        this\.container\.appendChild\(this\.el\);/,
    gizmoHtml
);

const gizmoJs = `
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
`;

code = code.replace(
    /        this\.el\.querySelector\('#btn-resume'\)\.addEventListener\('click', \(\) => this\.engine\.resume\(\)\);\n\n        this\.engine\.onEvent = \(e\) => \{/,
    gizmoJs
);

fs.writeFileSync('src/ui/ScenarioEditor.js', code);
