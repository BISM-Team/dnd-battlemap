document.getElementById("startRoom").addEventListener("click", startRoom, false);
document.getElementById("joinRoom").addEventListener("click", joinRoom, false);

function startRoom() {
    const room = document.getElementById('room').value;
    if(room) {
        console.log('startRoom ' + room);
        const req = new XMLHttpRequest();
        req.onload = startRoomResListener;
        req.open('POST', `rooms/${room}`);
        req.send();
    }
}
function startRoomResListener() {
    console.log(this.status, this.responseText);
}

function joinRoom() {
    const room = document.getElementById('room').value;
    const name = document.getElementById('name').value;
    document.getElementById('room').value = '';
    document.getElementById('name').value = '';
    if(room && name) {
        console.log('joinRoom ' + room);
        const url = new URL('campaign.html', location);
        url.searchParams.append('room', room);
        url.searchParams.append('name', name);
        var win = window.open(url);
        win.focus();
    }
}