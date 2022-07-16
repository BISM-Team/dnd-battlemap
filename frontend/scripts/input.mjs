import { engine } from './scene.mjs'
import { StandardSceneInput } from './input_modes/standard_scene_input.mjs'
import { FileInput } from './input_modes/file_input.mjs'
import { UiStandardInput } from './input_modes/ui_standard_input.mjs';
import { LineSceneInput } from './input_modes/line_scene_input.mjs';

export let standard_scene_input;
export let file_input;
export let ui_standard_input;
export let line_scene_input;

standard_scene_input = new StandardSceneInput();
file_input = new FileInput();
ui_standard_input = new UiStandardInput();
line_scene_input = new LineSceneInput();

export function addStandardSceneBindings() {
    standard_scene_input.enable();
    file_input.enable();
    ui_standard_input.enable();

    window.addEventListener("resize", function() {
        engine.resize();
    });

    const canvas = document.getElementById("renderCanvas");
    let height = parseInt(canvas.getAttribute("height"));
    canvas.setAttribute("height", Math.round(height*0.94).toString())
}