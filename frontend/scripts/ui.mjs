import { scaleUpObject, scaleDownObject, rotateObject, changeActiveLayer } from "./input.mjs";
import { manifest, player, players } from "./controller.mjs";
import { sendUpdateObject } from "./connection.mjs"

const rotate_btn = document.getElementById("rotate");
const scale_btn = document.getElementById("scale");
const visibility_btn = document.getElementById("visibility");
const check_all_box = document.getElementById("check-all-box");
const visibility_dropdown = document.getElementById("visibility-drop-down");
const layerSelection = document.getElementById("layerSelection");

let obj=null;

function updateVisibilityDropdown() {
    visibility_dropdown.classList.toggle("visible");
    visibility_dropdown.classList.toggle("hidden");
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

rotate_btn.addEventListener('contextmenu', e => e.preventDefault());

scale_btn.addEventListener('contextmenu', e => e.preventDefault());

visibility_btn.addEventListener('contextmenu', e => e.preventDefault());

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

layerSelection.addEventListener("change", () => {
    changeActiveLayer(parseInt(layerSelection.value));
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
    document.getElementById("visibility-drop-down").classList.remove("visible");
    if(!document.getElementById("visibility-drop-down").classList.contains("hidden"))
        document.getElementById("visibility-drop-down").classList.add("hidden");
}

export function removeOptionsPanel() {
    document.getElementById("visibility-drop-down").classList.remove("visible");
    document.getElementById("visibility-drop-down").classList.add("hidden");
}