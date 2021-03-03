import * as socketJs from './scripts/socket.mjs';
import './scripts/scene.mjs';
import './scripts/DOM_bindings.mjs';

var queryString = location.search.substring(1);
var a = queryString.split("|");

if(a[0]) {
    console.log('connecting to room: ' + a[0]);
    socketJs.connectToRoom(a[0]);
} else {
    throw new Error('room not specified');
}