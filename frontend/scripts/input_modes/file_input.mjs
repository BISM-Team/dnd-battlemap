import { localUploadMesh } from '../connection.mjs'
import { manifest, active_layer, player } from '../controller.mjs'
import { LodObject } from '../manifest.mjs';

export class FileInput {
    enabled=false;
    canvas;
    fileInputs;

    constructor() {
        this.enable = this.enable.bind(this);
        this.disable = this.disable.bind(this);
        this.fileInputOnDragOver = this.fileInputOnDragOver.bind(this);
        this.fileInputOnDrop = this.fileInputOnDrop.bind(this);
        this.fileInputOnChange = this.fileInputOnChange.bind(this);
        this.canvasOnDrop = this.canvasOnDrop.bind(this);
    }
    
    enable() {
        this.canvas = document.getElementById("renderCanvas");
        this.fileInputs = document.getElementsByClassName("fileUpload");
    
        this.canvas.addEventListener('dragover', this.fileInputOnDragOver);
        this.canvas.addEventListener('drop', this.canvasOnDrop);
        
        if(this.fileInputs) for (const i of this.fileInputs) {
            const fileInput = this.fileInputs[i];
            fileInput.addEventListener('dragover', this.fileInputOnDragOver);
            fileInput.addEventListener('drop', this.fileInputOnDrop);
            fileInput.addEventListener('change', this.fileInputOnChange);
        }
        this.enabled=true;
    }

    disable() {
        this.canvas.removeEventListener('dragover', this.fileInputOnDragOver);
        this.canvas.removeEventListener('drop', this.canvasOnDrop);
        
        if(this.fileInputs) for (const i of this.fileInputs) {
            const fileInput = this.fileInputs[i];
            fileInput.removeEventListener('dragover', this.fileInputOnDragOver);
            fileInput.removeEventListener('drop', this.fileInputOnDrop);
            fileInput.removeEventListener('change', () => { this.fileInputOnChange(fileInput); });
        }
        this.canvas = null;
        this.fileInputs = null;
        this.enabled = false;
    }
    
    fileInputOnDragOver(event) {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }
    
    fileInputOnDrop(event) {
        event.stopPropagation();
        event.preventDefault();
        if(event.dataTransfer.files.length > 0) {
            for(let file of event.dataTransfer.files) {
                localUploadMesh(file);
            }
        }
    }
    
    fileInputOnChange(fileInput) {
        if(fileInput.files.length > 0) {
            for(let file of fileInput.files) {
                localUploadMesh(file);
            }
        }
    }
    
    async canvasOnDrop(event) {
        event.stopPropagation();
        event.preventDefault();
        const text = event.dataTransfer.getData('text/plain');
        if(text) {
            if(active_layer>=0) {
                let obj = new LodObject(manifest.getUniqueName(player.name+text), null, text, active_layer, [player]);
                await manifest.update(obj);
            }
        }
    }
}