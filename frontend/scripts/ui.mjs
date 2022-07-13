import { scaleUpObject, scaleDownObject, rotateObject, changeActiveLayer } from "./input.mjs";
import { manifest, player, players } from "./controller.mjs";
import { sendUpdateObject } from "./connection.mjs"

const canvas = document.getElementById("renderCanvas");
const layer_btn = document.getElementById("layerButton");
const rotate_btn = document.getElementById("rotate");
const scale_btn = document.getElementById("scale");
const visibility_btn = document.getElementById("visibility");
const check_all_box = document.getElementById("check-all-box");
const visibility_dropdown = document.getElementById("visibility-drop-down");
const layer_selection = document.getElementById("layerSelection");
const object_control_buttons = [rotate_btn, scale_btn, visibility_btn];

let obj=null;

function updateVisibilityDropdown() {
    visibility_dropdown.classList.toggle("visible");
    check_all_box.checked = obj.visibleToAll;
    while (visibility_dropdown.childElementCount > 1) {
        visibility_dropdown.removeChild(visibility_dropdown.lastChild);
    }
    players.forEach( player => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        const span = document.createElement("span");
        label.appendChild(input);
        label.appendChild(span);
        span.innerHTML = player.player.name;
        input.type = "checkbox";
        input.name = player.player.name;
        input.value = player.player.name;
        input.checked = obj.viewers.findIndex( viewer => { return viewer.name == player.player.name; }) != -1;
        input.addEventListener("change", () => {
            if(!input.checked) obj.viewers.splice(obj.viewers.findIndex( viewer => { return viewer.name == player.player.name; }), 1);
            else obj.viewers.push(player.player);
            updateObj(obj);
        });
        visibility_dropdown.appendChild(label);
    });
}

layer_btn.addEventListener('contextmenu', e => e.preventDefault());

rotate_btn.addEventListener('contextmenu', e => e.preventDefault());

scale_btn.addEventListener('contextmenu', e => e.preventDefault());

visibility_btn.addEventListener('contextmenu', e => e.preventDefault());

layer_btn.addEventListener("mousedown", ev => {
    ev.preventDefault();
    layer_selection.classList.toggle("visible");
});


rotate_btn.addEventListener("mousedown", ev => {
    ev.preventDefault();
    if(obj) rotateObject(obj);
});

scale_btn.addEventListener("mousedown", ev => {
    ev.preventDefault();
    if(obj)
        if(ev.button==0)
            scaleUpObject(obj);
        else if(ev.button==2)
            scaleDownObject(obj);
});

visibility_btn.addEventListener("mousedown", updateVisibilityDropdown);

layer_selection.addEventListener("change", () => {
    changeActiveLayer(parseInt(layer_selection.value));
});

check_all_box.addEventListener("change", () => {
    obj.visibleToAll = check_all_box.checked;
    updateObj(obj);
});

async function updateObj(obj) {
    await manifest.update_single(obj.name, obj, player);
    sendUpdateObject(obj.name, obj);
}

export function addOptionsPanel(_mesh) {
    obj = manifest.getObjectFromLod(_mesh.name);
    visibility_dropdown.classList.remove("visible");
    object_control_buttons.forEach( item => {
        item.removeAttribute("disabled");
    })
}

export function removeOptionsPanel() {
    visibility_dropdown.classList.remove("visible");
    object_control_buttons.forEach( item => {
        item.setAttribute("disabled", "");
    })
}

window.addEventListener("resize", () => {

})

let height = parseInt(canvas.getAttribute("height"));
canvas.setAttribute("height", Math.round(height*0.94).toString())
