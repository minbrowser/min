/* imports common modules */

var electron = require('electron')
var ipc = electron.ipcRenderer
var webFrame

window.addEventListener('minUpdatedSettings', function () {
	ipc.sendToHost('updatedSettings')
})
