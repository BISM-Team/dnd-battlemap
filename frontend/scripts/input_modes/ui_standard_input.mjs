import { standard_scene_input } from "../input.mjs";
import { manifest, player, players } from "../controller.mjs";
import { sendUpdateObject } from "../connection.mjs"

export class UiStandardInput {
    enabled=false;
    obj=null;

    layer_btn = null;
    rotate_btn = null;
    scale_btn = null;
    visibility_btn = null;
    check_all_box = null;
    visibility_dropdown = null;
    layer_selection = null;
    object_control_buttons = [];

    constructor() {
        this.enable = this.enable.bind(this);
        this.disable = this.disable.bind(this);
        this.layerBtnMouseDown = this.layerBtnMouseDown.bind(this);
        this.rotateBtnMouseDown = this.rotateBtnMouseDown.bind(this);
        this.scaleBtnMouseDown = this.scaleBtnMouseDown.bind(this);
        this.layerSelectionChange = this.layerSelectionChange.bind(this);
        this.updateVisibilityDropdown = this.updateVisibilityDropdown.bind(this);
        this.checkAllBox = this.checkAllBox.bind(this);
        this.updateObj = this.updateObj.bind(this);
        this.addOptionsPanel = this.addOptionsPanel.bind(this);
        this.removeOptionsPanel = this.removeOptionsPanel.bind(this);
    }

    enable() {
        this.layer_btn = document.getElementById("layerButton");
        this.rotate_btn = document.getElementById("rotate");
        this.scale_btn = document.getElementById("scale");
        this.visibility_btn = document.getElementById("visibility");
        this.check_all_box = document.getElementById("check-all-box");
        this.visibility_dropdown = document.getElementById("visibility-drop-down");
        this.layer_selection = document.getElementById("layerSelection");
        this.object_control_buttons = [this.rotate_btn, this.scale_btn, this.visibility_btn];

        this.layer_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.rotate_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.scale_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.visibility_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.layer_btn.addEventListener("mousedown", this.layerBtnMouseDown);
        this.rotate_btn.addEventListener("mousedown", this.rotateBtnMouseDown);
        this.scale_btn.addEventListener("mousedown", this.scaleBtnMouseDown);
        this.visibility_btn.addEventListener("mousedown", this.updateVisibilityDropdown);
        this.layer_selection.addEventListener("change", this.layerSelectionChange);
        this.check_all_box.addEventListener("change", this.checkAllBox);

        this.enabled = true;
    }

    disable() {
        this.layer_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.rotate_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.scale_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.visibility_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.layer_btn.removeEventListener("mousedown", this.layerBtnMouseDown);
        this.rotate_btn.removeEventListener("mousedown", this.rotateBtnMouseDown);
        this.scale_btn.removeEventListener("mousedown", this.scaleBtnMouseDown);
        this.visibility_btn.removeEventListener("mousedown", this.updateVisibilityDropdown);
        this.layer_selection.removeEventListener("change", this.layerSelectionChange);
        this.check_all_box.removeEventListener("change", this.checkAllBox);

        this.layer_btn = null;
        this.rotate_btn = null;
        this.scale_btn = null;
        this.visibility_btn = null;
        this.check_all_box = null;
        this.visibility_dropdown = null;
        this.layer_selection = null;
        this.object_control_buttons = [];

        this.enabled = false;
    }

    layerBtnMouseDown(ev) {
        ev.preventDefault();
        this.layer_selection.classList.toggle("visible");
    }

    rotateBtnMouseDown(ev) {
        ev.preventDefault();
        if(this.obj)
            if(ev.button==0)
                { if(standard_scene_input.enabled) standard_scene_input.rotateRightObject(this.obj); }
            else if(ev.button==2)
                { if(standard_scene_input.enabled) standard_scene_input.rotateLeftObject(this.obj); }
    }

    scaleBtnMouseDown(ev) {
        ev.preventDefault();
        if(this.obj)
            if(ev.button==0) 
                { if(standard_scene_input.enabled) standard_scene_input.scaleUpObject(this.obj); }
            else if(ev.button==2)
                { if(standard_scene_input.enabled) standard_scene_input.scaleDownObject(this.obj); }
    }

    layerSelectionChange() {
        if(standard_scene_input.enabled) standard_scene_input.changeActiveLayer(parseInt(this.layer_selection.value));
    }

    updateVisibilityDropdown() {
        this.visibility_dropdown.classList.toggle("visible");
        this.check_all_box.checked = this.obj.visibleToAll;
        while (this.visibility_dropdown.childElementCount > 1) {
            this.visibility_dropdown.removeChild(this.visibility_dropdown.lastChild);
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
            input.checked = this.obj.viewers.findIndex( viewer => { return viewer.name == player.player.name; }) != -1;
            input.addEventListener("change", () => {
                if(!input.checked) this.obj.viewers.splice(this.obj.viewers.findIndex( viewer => { return viewer.name == player.player.name; }), 1);
                else this.obj.viewers.push(player.player);
                this.updateObj(this.obj);
            });
            this.visibility_dropdown.appendChild(label);
        });
    }

    checkAllBox() {
        this.obj.visibleToAll = this.check_all_box.checked;
        this.updateObj(this.obj);
    }

    async updateObj(obj) {
        await manifest.update_single(obj.name, obj, player);
        sendUpdateObject(obj.name, obj);
    }
    
    addOptionsPanel(object) {
        this.obj = object;
        this.visibility_dropdown.classList.remove("visible");
        this.object_control_buttons.forEach( item => {
            item.removeAttribute("disabled");
        })
    }
    
    removeOptionsPanel() {
        this.obj = null;
        this.visibility_dropdown.classList.remove("visible");
        this.object_control_buttons.forEach( item => {
            item.setAttribute("disabled", "");
        })
    }

}