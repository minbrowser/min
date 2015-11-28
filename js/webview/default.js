/* imports common modules */

var electron = require("electron");
var ipc = electron.ipcRenderer;
var webFrame = electron.webFrame;

/* disable getUserMedia/Geolocation until we have permissions prompts for this https://github.com/atom/electron/issues/3268 */

delete navigator.__proto__.geolocation;
delete navigator.__proto__.webkitGetUserMedia;
delete navigator.__proto__.getUserMedia;
