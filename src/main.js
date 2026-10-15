import './style.css';
import { FieldScene } from './field/Scene.js';
import { createStore } from './store.js';
import { PlayerEditor } from './ui/PlayerEditor.js';
import { HelpDialog } from './ui/HelpDialog.js';

const app = document.getElementById('app');
app.innerHTML = '<div id="view-root"><div id="field-test" style="width:100%;height:100vh;"></div></div>';
const container = document.getElementById('field-test');
const store = createStore();
const scene = new FieldScene(container, store);
window.appScene = scene; // Expose for UI camera manipulation
import { ScenarioEditor } from "./ui/ScenarioEditor.js";
const editorContainer = document.createElement("div");
editorContainer.style.position = "absolute";
editorContainer.style.top = "10px";
editorContainer.style.left = "10px";
editorContainer.style.zIndex = "100";
app.appendChild(editorContainer);
new ScenarioEditor(scene.engine, editorContainer);
const playerEditorContainer = document.createElement('div');
playerEditorContainer.style.position = 'absolute';
playerEditorContainer.style.top = '10px';
playerEditorContainer.style.right = '10px';
playerEditorContainer.style.zIndex = '100';
app.appendChild(playerEditorContainer);
new PlayerEditor(store, playerEditorContainer);
new HelpDialog(app);
