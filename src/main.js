import './style.css';
import { FieldScene } from './field/Scene.js';

const app = document.getElementById('app');
app.innerHTML = '<div id="view-root"><div id="field-test" style="width:100%;height:100vh;"></div></div>';
const container = document.getElementById('field-test');
const scene = new FieldScene(container);
window.appScene = scene; // Expose for UI camera manipulation
import { ScenarioEditor } from "./ui/ScenarioEditor.js";
const editorContainer = document.createElement("div");
editorContainer.style.position = "absolute";
editorContainer.style.top = "10px";
editorContainer.style.left = "10px";
editorContainer.style.zIndex = "100";
app.appendChild(editorContainer);
new ScenarioEditor(scene.engine, editorContainer);
