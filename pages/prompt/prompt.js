const { ipcRenderer } = require('electron')

function cancel () {
  ipcRenderer.send('close-prompt', '')
  this.close()
}

function response () {
  var values = {}

  const inputs = document.getElementsByTagName('input')
  for (var i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    values[input.id] = input.value
  }

  ipcRenderer.send('close-prompt', values)
  this.close()
}

function handleKeyPress (event) {
  var key = event.keyCode || event.which
  if (key === 13) {
    response()
  }
}

// flip the button order on mac

if (navigator.platform === 'MacIntel') {
  document.getElementById('cancel').parentNode.insertBefore(document.getElementById('cancel'), document.getElementById('ok'))
}

window.addEventListener('load', function () {
  var options = ipcRenderer.sendSync('open-prompt', '')
  var params = JSON.parse(options)
  const { okLabel = 'OK', cancelLabel = 'Cancel', darkMode = -1, values = [] } = params

  if (values && values.length > 0) {
    const inputContainer = document.getElementById('input-container')

    values.forEach((value, index) => {
      var input = document.createElement('input')
      input.type = value.type
      input.placeholder = value.placeholder
      input.id = value.id
      inputContainer.appendChild(input)

      if (index === 0) {
        input.focus()
      }

      if (index < values.length - 1) {
        input.style.marginBottom = '0.4em'
        const br = document.createElement('br')
        inputContainer.appendChild(br)
      }

      input.addEventListener('keydown', function (e) {
        if (e.keyCode === 27) {
          // escape key
          cancel()
        }

        if (e.keyCode === 13) {
          if (index < values.length - 1) {
            // focus next input
            document.getElementsByTagName('input')[index + 1].focus()
          } else {
            response()
          }
        }
      })
    })
  }

  if (darkMode === 1 || darkMode === true) { document.body.classList.add('dark-mode') }
  if (params.label) {
    document.getElementById('label').innerHTML = params.label
  } else {
    document.getElementById('label').hidden = true
  }
  document.getElementById('ok').value = okLabel
  document.getElementById('cancel').value = cancelLabel
})
