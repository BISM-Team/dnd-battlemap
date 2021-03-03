document.getElementById("startRoom").addEventListener("click", startRoom, false);
document.getElementById("joinRoom").addEventListener("click", joinRoom, false);

function startRoom() {
    const room = document.getElementById('room').value;
    document.getElementById('room').value = '';
    if(room) {
        console.log('startRoom ' + room);
        const req = new XMLHttpRequest();
        req.onload = startRoomResListener;
        req.open('POST', `${window.location}rooms/${room}`);
        req.send();
    }
}
function startRoomResListener() {
    console.log(this.responseStatus, this.responseText);
}

function joinRoom() {
    const room = document.getElementById('room').value;
    document.getElementById('room').value = '';
    if(room) {
        console.log('joinRoom ' + room);
        var win = window.open(`${window.location}scene.html?${room}`, '_blank');
        win.focus();
    }
}