import { scaleUpMesh, scaleDownMesh, rotateMesh } from "./input.mjs";
import { manifest, player, players, setActiveLayer } from "./controller.mjs";
import { sendUpdateMesh } from "./connection.mjs"

const rotate_btn = document.getElementById("rotate");
const scale_btn = document.getElementById("scale");
const visibility_btn = document.getElementById("visibility");
const check_all_box = document.getElementById("check-all-box");
const player_checkboxes = document.getElementById("player-checkboxes");
const layerSelection = document.getElementById("layerSelection");

let mesh=null;
let obj=null;


rotate_btn.addEventListener('contextmenu', e => e.preventDefault());

scale_btn.addEventListener('contextmenu', e => e.preventDefault());

visibility_btn.addEventListener('contextmenu', e => e.preventDefault());


rotate_btn.addEventListener("mousedown", ev => {
    ev.preventDefault();
    if(mesh) rotateMesh(mesh);
});

scale_btn.addEventListener("mousedown", ev => {
    ev.preventDefault();
    if(mesh)
        if(ev.button==0)
            scaleUpMesh(mesh);
        else if(ev.button==2)
            scaleDownMesh(mesh);
});

visibility_btn.addEventListener("mousedown", () => {
    document.getElementById("visibility-drop-down").classList.toggle("visible");
    document.getElementById("visibility-drop-down").classList.toggle("hidden");
    check_all_box.checked = obj.visibleToAll;
    while (player_checkboxes.firstChild) {
        player_checkboxes.removeChild(player_checkboxes.lastChild);
    }
    players.forEach( player => {
        console.log(player.player);
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
        player_checkboxes.appendChild(label);
    });
});

layerSelection.addEventListener("change", () => {
    setActiveLayer(parseInt(layerSelection.value));
});

check_all_box.addEventListener("change", () => {
    obj.visibleToAll = check_all_box.checked;
    updateObj(obj);
});

async function updateObj(obj) {
    await manifest.update_single(obj.name, obj, player);
    sendUpdateMesh(obj.name, obj);
}

export function addOptionsPanel(_mesh) {
    mesh = _mesh;
    obj = manifest.find(manifest.getMeshNameFromLod(mesh.name));
    document.getElementById("optionsPanel").classList.add("visible");
    document.getElementById("optionsPanel").classList.remove("hidden");
    
    document.getElementById("visibility-drop-down").classList.remove("visible");
    if(!document.getElementById("visibility-drop-down").classList.contains("hidden"))
        document.getElementById("visibility-drop-down").classList.add("hidden");
}

export function removeOptionsPanel() {
    document.getElementById("optionsPanel").classList.remove("visible");
    document.getElementById("optionsPanel").classList.add("hidden");

    document.getElementById("visibility-drop-down").classList.remove("visible");
    if(!document.getElementById("visibility-drop-down").classList.contains("hidden"))
        document.getElementById("visibility-drop-down").classList.add("hidden");
}