/* imports common modules */

var electron = require('electron')
var ipc = electron.ipcRenderer

/* define window.chrome
   this is necessary because some websites (such as the Google Drive file viewer, see issue #378) check for a
   Chrome user agent, and then do things like if(chrome.<module>) {}
   so we need to define an empty chrome object to prevent errors
   */

window.chrome = {}

var propertiesToClone = ['altKey', 'bubbles', 'cancelBubble', 'cancelable', 'charCode', 'code', 'composed', 'ctrlKey', 'defaultPrevented', 'detail', 'eventPhase', 'isComposing', 'isTrusted', 'key', 'keyCode', 'location', 'metaKey', 'repeat', 'returnValue', 'shiftKey', 'type', 'which']

function cloneEvent (e) {
  var obj = {}
  for (var key in e) {
    if (propertiesToClone.indexOf(key) !== -1) {
      obj[key] = e[key]
    }
  }
  return JSON.stringify(obj)
}

window.addEventListener('keydown', function (e) {
  ipc.send('receive-event', cloneEvent(e))
})

window.addEventListener('keypress', function (e) {
  ipc.send('receive-event', cloneEvent(e))
})

window.addEventListener('keyup', function (e) {
  ipc.send('receive-event', cloneEvent(e))
})
