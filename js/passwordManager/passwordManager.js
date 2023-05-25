const { ipcRenderer } = require('electron')

const settings = require('util/settings/settings.js')
const webviews = require('webviews.js')
const keybindings = require('keybindings.js')
const statistics = require('js/statistics.js')

const Bitwarden = require('js/passwordManager/bitwarden.js')
const OnePassword = require('js/passwordManager/onePassword.js')
const Keychain = require('js/passwordManager/keychain.js')

const managers = [
  new Bitwarden(),
  new OnePassword(),
  new Keychain()
]

function getActivePasswordManager () {
  if (managers.length === 0) {
    return null
  }

  const managerSetting = settings.get('passwordManager')
  if (managerSetting === null) {
    return managers.find(({ name }) => name === 'Built-in password manager')
  }
  return managers.find(({ name }) => name === managerSetting.name)
}

async function getConfiguredPasswordManager () {
  const manager = getActivePasswordManager()
  if (!manager) {
    return null
  }

  const configured = await manager.checkIfConfigured()
  if (!configured) {
    return null
  }

  return manager
}

// Shows a prompt dialog for password store's master password.
async function promptForMasterPassword (manager) {
  return new Promise((resolve, reject) => {
    const { password } = ipcRenderer.sendSync('prompt', {
      text: l('passwordManagerUnlock').replace('%p', manager.name),
      values: [{ placeholder: l('password'), id: 'password', type: 'password' }],
      ok: l('dialogConfirmButton'),
      cancel: l('dialogSkipButton'),
      height: 175
    })
    if (password === null || password === '') {
      reject(new Error('No password provided'))
    } else {
      resolve(password)
    }
  })
}

async function unlock (manager) {
  let success = false
  while (!success) {
    let password
    try {
      password = await promptForMasterPassword(manager)
    } catch (e) {
      // dialog was canceled
      break
    }
    try {
      success = await manager.unlockStore(password)
    } catch (e) {
      // incorrect password, prompt again
    }
  }
  return success
}

// Binds IPC events.
function initialize () {
  // Called when page preload script detects a form with username and password.
  webviews.bindIPC('password-autofill', async (tab, args, frameId, frameURL) => {
    const manager = await getConfiguredPasswordManager()
    if (!manager) {
      return
    }

    // it's important to use frameURL here and not the tab URL, because the domain of the
    // requesting iframe may not match the domain of the top-level page
    let hostname = new URL(frameURL).hostname

    if (!manager.isUnlocked()) {
      await unlock(manager)
    }

    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4)
    }

    try {
      const credentials = await manager.getSuggestions(hostname)
      if (credentials !== null) {
        webviews.callAsync(tab, 'sendToFrame', [frameId, 'password-autofill-match', {
          credentials,
          hostname
        }])
      }
    } catch (e) {
      console.error(`Failed to get password suggestions: ${e.message}`)
    }
  })

  webviews.bindIPC('password-autofill-check', function (tab, args, frameId) {
    if (getActivePasswordManager()) {
      webviews.callAsync(tab, 'sendToFrame', [frameId, 'password-autofill-enabled'])
    }
  })

  keybindings.defineShortcut('fillPassword', function () {
    webviews.callAsync(tabs.getSelected(), 'send', ['password-autofill-shortcut'])
  })

  statistics.registerGetter('passwordManager', function () {
    return getActivePasswordManager().name
  })
}

module.exports = { getActivePasswordManager, getConfiguredPasswordManager, initialize }
