const { ipcRenderer } = require('electron')

function cancel() {
  ipcRenderer.send('close-prompt', '')
  this.close()
}

function response() {
  var values = {}

  let inputs = document.getElementsByTagName('input')
  for (var i = 0; i < inputs.length; i++) {
    let input = inputs[i]
    values[input.id] = input.value
  }

  ipcRenderer.send('close-prompt', values)
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
  const { ok = 'OK', cancel = 'Cancel', darkMode = false, values = [] } = params

  if (values && values.length > 0) {
    let inputContainer = document.getElementById('input-container')

    values.forEach((value, index) => {
      // Dirty fix for auto-focus. If we're adding ALL inputs programmatically, we can't autofocus on first one.
      // So instead for the first config value we're re-writing the default input's values.
      var input = null
      if (index == 0) {
        input = inputContainer.getElementsByTagName('input')[0]
      } else {
        input = document.createElement('input')
        inputContainer.appendChild(input)
      }

      input.type = value.type
      input.placeholder = value.placeholder
      input.id = value.id

      if (index < values.length - 1) {
        input.style.marginBottom = '0.4em'
        let br = document.createElement('br')
        inputContainer.appendChild(br)
      } else {
        // Hitting return on last input will trigger submit.
        input.onkeypress = handleKeyPress
      }
    })
  }

  if (darkMode) { document.body.classList.add('dark-mode') }
  document.getElementById('label').innerHTML = params.label
  document.getElementById('ok').value = ok
  document.getElementById('cancel').value = cancel
})

