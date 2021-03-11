import * as connectionJs from './scripts/connection.mjs';
import './scripts/scene.mjs';
import './scripts/input.mjs';

const assetPickerShower = document.getElementById("assetPickerShower");
const updateButton = document.getElementById("updateAssets");
const assetList = document.getElementById("assetList");

assetPickerShower.addEventListener("click", showAssetPicker, false);
updateButton.addEventListener("click", updateAssets, false);

var queryString = location.search.substring(1);
var a = queryString.split("|");

if(a[0]) {
    console.log('connecting to room: ' + a[0]);
    connectionJs.connectToRoom(a[0]);
    updateAssets();
} else {
    throw new Error('room not specified');
}

function showAssetPicker() {
    document.getElementById("assetPicker").classList.toggle("slide-in");
}

function updateAssets() {
    const req = new XMLHttpRequest();
    req.onload = applyUpdate;
    req.open('GET', `assets/`);
    req.send();
    console.log('update assets');
}

function applyUpdate() {
    const assets = JSON.parse(this.response);
    assetList.innerHTML = '';
    assets.forEach(asset => {
        const element = document.createElement('p');
        element.addEventListener("dragstart", dragElement);
        element.innerText = asset;
        element.draggable = true;
        assetList.appendChild(element);
    });
}

function dragElement(ev) {
    ev.dataTransfer.setData("text/plain", ev.target.innerText);
}