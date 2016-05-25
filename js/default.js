window.electron = require('electron')
window.ipc = electron.ipcRenderer
window.remote = electron.remote
window.Dexie = require('dexie')

// disable dragdrop, since it currently doesn't work
window.addEventListener('drop', function (e) {
  e.preventDefault()
})

// add a class to the body for fullscreen status

ipc.on('enter-full-screen', function () {
  document.body.classList.add('fullscreen')
})

ipc.on('leave-full-screen', function () {
  document.body.classList.remove('fullscreen')
})

window.addEventListener('load', function (e) {
  if (navigator.platform !== 'MacIntel') {
    document.body.classList.add('notMac')
  }
})
