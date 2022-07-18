import { line_scene_input, standard_scene_input } from "../input.mjs";
import { manifest, players, setActiveLayer } from "../controller.mjs";

export class UiStandardInput {
    enabled=false;
    obj=null;

    layer_btn;
    rotate_btn;
    scale_btn;
    visibility_btn;
    input_mode_btn;
    check_all_box;
    visibility_dropdown;
    input_mode_dropdown;
    layer_selection;
    input_mode_selection;
    object_control_buttons;

    constructor() {
        this.layerBtnMouseDown = this.layerBtnMouseDown.bind(this);
        this.inputModeBtnMouseDown = this.inputModeBtnMouseDown.bind(this);
        this.rotateBtnMouseDown = this.rotateBtnMouseDown.bind(this);
        this.scaleBtnMouseDown = this.scaleBtnMouseDown.bind(this);
        this.layerSelectionChange = this.layerSelectionChange.bind(this);
        this.inputModeChange = this.inputModeChange.bind(this);
        this.visibilityBtnMouseDown = this.visibilityBtnMouseDown.bind(this);
        this.checkAllBoxChange = this.checkAllBoxChange.bind(this);
        this.addOptionsPanel = this.addOptionsPanel.bind(this);
        this.removeOptionsPanel = this.removeOptionsPanel.bind(this);
    }

    enable() {
        this.layer_btn = document.getElementById("layerButton");
        this.rotate_btn = document.getElementById("rotate");
        this.scale_btn = document.getElementById("scale");
        this.visibility_btn = document.getElementById("visibility");
        this.input_mode_btn = document.getElementById("inputMode");
        this.check_all_box = document.getElementById("check-all-box");
        this.visibility_dropdown = document.getElementById("visibility-drop-down");
        this.input_mode_dropdown = document.getElementById("inputModeDropdown");
        this.layer_selection = document.getElementById("layerSelection");
        this.input_mode_selection = [document.getElementById("standardRadio"), document.getElementById("lineRadio")];
        this.object_control_buttons = [this.rotate_btn, this.scale_btn, this.visibility_btn];

        this.layer_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.rotate_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.scale_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.visibility_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.input_mode_btn.addEventListener('contextmenu', e => e.preventDefault());
        this.layer_btn.addEventListener("mousedown", this.layerBtnMouseDown);
        this.rotate_btn.addEventListener("mousedown", this.rotateBtnMouseDown);
        this.scale_btn.addEventListener("mousedown", this.scaleBtnMouseDown);
        this.visibility_btn.addEventListener("mousedown", this.visibilityBtnMouseDown);
        this.input_mode_btn.addEventListener("mousedown", this.inputModeBtnMouseDown);
        this.layer_selection.addEventListener("change", this.layerSelectionChange);
        this.input_mode_selection.forEach(selection => selection.addEventListener("change", this.inputModeChange));
        this.check_all_box.addEventListener("change", this.checkAllBoxChange);

        this.enabled = true;
    }

    disable() {
        this.layer_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.rotate_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.scale_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.visibility_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.input_mode_btn.removeEventListener('contextmenu', e => e.preventDefault());
        this.layer_btn.removeEventListener("mousedown", this.layerBtnMouseDown);
        this.rotate_btn.removeEventListener("mousedown", this.rotateBtnMouseDown);
        this.scale_btn.removeEventListener("mousedown", this.scaleBtnMouseDown);
        this.visibility_btn.removeEventListener("mousedown", this.visibilityBtnMouseDown);
        this.input_mode_btn.removeEventListener("mousedown", this.inputModeBtnMouseDown);
        this.layer_selection.removeEventListener("change", this.layerSelectionChange);
        this.input_mode_selection.forEach(selection => selection.removeEventListener("change", this.inputModeChange));
        this.check_all_box.removeEventListener("change", this.checkAllBoxChange);

        this.layer_btn = null;
        this.rotate_btn = null;
        this.scale_btn = null;
        this.visibility_btn = null;
        this.input_mode_btn = null;
        this.check_all_box = null;
        this.visibility_dropdown = null;
        this.input_mode_dropdown = null;
        this.layer_selection = null;
        this.input_mode_selection = [];
        this.object_control_buttons = [];

        this.enabled = false;
    }

    layerBtnMouseDown(ev) {
        ev.preventDefault();
        this.layer_selection.classList.toggle("visible");
    }

    async rotateBtnMouseDown(ev) {
        ev.preventDefault();
        if(this.obj)
            if(ev.button==0)
                { if(standard_scene_input.enabled) await standard_scene_input.rotateRightObject(this.obj); }
            else if(ev.button==2)
                { if(standard_scene_input.enabled) await standard_scene_input.rotateLeftObject(this.obj); }
    }

    async scaleBtnMouseDown(ev) {
        ev.preventDefault();
        if(this.obj)
            if(ev.button==0) 
                { if(standard_scene_input.enabled) await standard_scene_input.scaleUpObject(this.obj); }
            else if(ev.button==2)
                { if(standard_scene_input.enabled) await standard_scene_input.scaleDownObject(this.obj); }
    }

    async layerSelectionChange() {
        const l = parseInt(this.layer_selection.value)
        if(standard_scene_input.enabled) await standard_scene_input.changeActiveLayer(l);
        setActiveLayer(l);
    }

    inputModeBtnMouseDown(ev) {
        ev.preventDefault();
        this.input_mode_dropdown.classList.toggle("visible");
    }

    inputModeChange() {
        const value = document.querySelector("#inputModeDropdown input:checked").getAttribute("value");
        switch(value) {
            case "standard":
                if(line_scene_input.enabled) line_scene_input.disable();
                if(!standard_scene_input.enabled) standard_scene_input.enable();
                break;
            
            case "line":
                if(standard_scene_input.enabled) standard_scene_input.disable();
                if(!line_scene_input.enabled) line_scene_input.enable();
                break;
        }
    }

    visibilityBtnMouseDown() {
        this.visibility_dropdown.classList.toggle("visible");
        this.check_all_box.checked = this.obj.visibility.visibleToAll;
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
            input.checked = this.obj.visibility.viewers.findIndex( viewer => { return viewer.name == player.player.name; }) != -1;
            input.addEventListener("change", async () => {
                if(!input.checked) this.obj.visibility.viewers.splice(this.obj.visibility.viewers.findIndex( viewer => { return viewer.name == player.player.name; }), 1);
                else this.obj.visibility.viewers.push(player.player);
                await manifest.update(this.obj);
            });
            this.visibility_dropdown.appendChild(label);
        });
    }

    async checkAllBoxChange() {
        this.obj.visibility.visibleToAll = this.check_all_box.checked;
        await manifest.update(this.obj);
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