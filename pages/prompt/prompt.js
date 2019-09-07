const { ipcRenderer } = require('electron')

function cancel() {
  ipcRenderer.send('close-prompt', '')
  this.close()
}

function response() {
  ipcRenderer.send('close-prompt', document.getElementById('data').value)
  this.close()
}

function handleKeyPress(event) {
  var key = event.keyCode || event.which
  if (key == 13) {
    response()
  }
}

window.addEventListener('load', function() {
  var options = ipcRenderer.sendSync('open-prompt', '')
  var params = JSON.parse(options)
  document.getElementById('label').innerHTML = params.label;
  document.getElementById('data').value = params.value;
  document.getElementById('ok').value = params.ok;
  document.getElementById('data').focus();
})

