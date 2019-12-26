const fs = require('fs')
const { ipcRenderer, remote } = require('electron')
const app = remote.app

window.addEventListener('load', function() {
  // Override links to send content to main window.
  let anchors = document.getElementsByTagName('a')
  for (let i = 0; i < anchors.length; i++) {
    anchors[i].onclick = function () {
      ipcRenderer.send('autofill-link', this.href)
      return false
    }
  }

  // Get additional options from the window's creator.
  let options = ipcRenderer.sendSync('autofill-open', '')

  // Setup dark mode.
  if (options.darkMode) {
    document.body.classList.add('dark-mode')
  }

  // Add drag-and-drop listener.
  let dragBox = document.getElementsByClassName('drag-and-drop-box')[0]

  dragBox.ondragover = () => {
    return false
  }

  dragBox.ondragleave = () => {
    return false
  }

  dragBox.ondragend = () => {
    return false
  }

  dragBox.ondrop = (e) => {
    e.preventDefault()

    if (e.dataTransfer.files.length == 0) {
      return
    }

    dragBox.innerHTML = l('bitwardenInstalling')

    try {
      const filePath = e.dataTransfer.files[0].path

      install(filePath).then(toolPath => {
        // Verify the tool by trying to use it to ulock the password store.
        let data = ipcRenderer.sendSync('prompt', {
            text: l('bitwardenVerify'),
            values: [{ placeholder: l('email'), id: 'email', type: 'text' }, { placeholder: l('password'), id: 'password', type: 'password' }],
            ok: l('bitwardenConfirmButton'),
            cancel: l('bitwardenSkipButton'),
            width: 500,
            height: 240,
            parent: options.parent,
        })

        return { toolPath, data }
      }).then(values => {
        const { toolPath, data } = values
        unlockAndSave(dragBox, toolPath, data)
      })
    } catch (e) {
      alert(l('bitwardenError') + e.message)

      // Cleanup after we failed.
      let targetFilePath = app.getPath('userData') + '/tools/bw'
      if (fs.existsSync(targetFilePath)) {
        fs.unlinkSync(toolsDir)
      }
    }

    return false
  }
})

// Disable Bitwarden.
function disable() {
  ipcRenderer.send('autofill-close', false)
  this.close()
}

// Cancel until next launch.
function cancel() {
  this.close()
}

// Install the tool into the Min user folder.
function install(filePath, callback) {
  return new Promise((resolve, reject) => {
    try {
      let toolsDir = app.getPath('userData') + '/tools'
      if (!fs.existsSync(toolsDir)) {
        fs.mkdirSync(toolsDir)
      }

      let targetFilePath = toolsDir + '/bw'
      fs.createReadStream(filePath).pipe(fs.createWriteStream(targetFilePath)).on('finish', function() {
        fs.chmodSync(targetFilePath, '755')
        resolve(targetFilePath)
      }).on('error', function(error) {
        reject(error)
      })
    } catch (e) {
      reject(e)
    }
  })
}

// Tries to unlock the store with given password and email. On success, updated the settings
// and dismisses the dialog. On error, displays the error message.
async function unlockAndSave(dragBox, path, data) {
  let process = new ProcessSpawner(path, ['login', '--raw', data.email, data.password])
  try {
    let key = await process.execute()
    let saved = ipcRenderer.sendSync('autofill-save', { key : 'bitwardenPath', value: path })
    if (saved) {
      ipcRenderer.send('autofill-close', true)
      dragBox.innerHTML = l('bitwardenDone')

      // Visible buttons.
      let buttons = document.getElementsByTagName('input')

      // Disable buttons so user can't overwrite the result in last second.
      for (button of buttons) {
        button.hidden = true
      }

      // Auto-close the window.
      window.setTimeout(window.close, 1000)
    } else {
      throw { error: null, data: l('bitwardenSettingsError') }
    }
  } catch (err) {
    const { error, data } = err
    const message = data.replace(/\n$/gm, '')
    dragBox.innerHTML = l('bitwardenUnlockError') + message + ' ' + l('bitwardenRetry')
  }
}

