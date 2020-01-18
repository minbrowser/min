var webviews = require('webviews.js')
var settings = require("util/settings/settings.js")
var browserUI = require("browserUI.js")
var ProcessSpawner = require("util/process.js")
var modalMode = require("modalMode.js")

function getBitwardenLink() {
  switch (window.platformType) {
    case "mac":
      return "https://vault.bitwarden.com/download/?app=cli&platform=macos"
      break;
    case "windows":
      return "https://vault.bitwarden.com/download/?app=cli&platform=windows"
      break;
    case "linux":
      return "https://vault.bitwarden.com/download/?app=cli&platform=windows"
      break;
  }
}

function showBitwardenDialog() {
  modalMode.toggle(true)
  document.getElementById('bitwarden-setup-dialog').hidden = false
  webviews.requestPlaceholder('bitwardenSetup')
}

function hideBitwardenDialog() {
  modalMode.toggle(false)
  document.getElementById('bitwarden-setup-dialog').hidden = true
  webviews.hidePlaceholder('bitwardenSetup')
}

document.getElementById("bitwarden-setup-disable").addEventListener("click", function () {
  settings.set('passwordManager', null)
  hideBitwardenDialog();
})

document.getElementById("bitwarden-setup-cancel").addEventListener("click", function () {
  hideBitwardenDialog();
})

var fs = require('fs')
var { ipcRenderer, remote } = require('electron')
var app = remote.app

document.getElementById('bitwarden-setup-link').addEventListener("click", function () {
  browserUI.addTab(tabs.add({
    url: getBitwardenLink(),
  }), { openInBackground: true })
})

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

  const filePath = e.dataTransfer.files[0].path

  //try to filter out anything that isn't an executable (note: not 100% accurate)
  if (e.dataTransfer.files[0].type !== "" && !e.dataTransfer.files[0].name.endsWith(".exe")) {
    dragBox.innerHTML = l('bitwardenRetry')
    return;
  }

  install(filePath).then(toolPath => {
    // Verify the tool by trying to use it to ulock the password store.
    let data = ipcRenderer.sendSync('prompt', {
      text: l('bitwardenVerify'),
      values: [{ placeholder: l('email'), id: 'email', type: 'text' }, { placeholder: l('password'), id: 'password', type: 'password' }],
      ok: l('bitwardenConfirmButton'),
      cancel: l('bitwardenSkipButton'),
      width: 500,
      height: 240,
    })

    return { toolPath, data }
  }).then(values => {
    const { toolPath, data } = values
    return unlockAndSave(dragBox, toolPath, data)
  })
  .catch(function (e) {
    // Cleanup after we failed.
    let targetFilePath = app.getPath('userData') + '/tools/bw'
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath)
    }
    
    console.log(e);
    const message = e.error.replace(/\n$/gm, '')
    dragBox.innerHTML = l('bitwardenUnlockError') + message + ' ' + l('bitwardenRetry')
    
  })

  return false
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
      fs.createReadStream(filePath).pipe(fs.createWriteStream(targetFilePath)).on('finish', function () {
        fs.chmodSync(targetFilePath, '755')
        resolve(targetFilePath)
      }).on('error', function (error) {
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
  // It's possible to be already logged in before installing the tool
  let logoutProcess = new ProcessSpawner(path, ['logout'])
  try {
    await logoutProcess.execute();
  } catch (e) {
    console.warn(e);
  }
  let process = new ProcessSpawner(path, ['login', '--raw', data.email, data.password])

  let key = await process.execute()
  settings.set('bitwardenPath', path)

  hideBitwardenDialog();
}

module.exports = showBitwardenDialog;
