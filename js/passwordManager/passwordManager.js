// Bitwarden password manager. Requires session key to unlock the vault.
class Bitwarden {
  constructor() {
    this.sessionKey = null
    this.lastCall = null
    this.name = 'Bitwarden'
  }

  // Async wrapper for settings getter.
  async _getSetting() {
    return new Promise((resolve, reject) => {
      let path = settings.get('bitwardenPath')
      if (path && path.length > 0) {
        resolve(path)
      } else {
        resolve(null)
      }
    })
  }

  // Checks if given command is a valid Bitwarden-CLI command.
  async _checkCommand(command) {
    try {
      let process = new ProcessSpawner(command, ['--version'])
      let data = await process.execute()
      if (data.length > 0) {
        return true
      }
    } catch (ex) {
      return false
    }
  }

  // Returns a Bitwarden-CLI tool path by checking possible locations.
  // First it checks if the tool was installed for Min specifically by
  // by checking the settings value. If that is not set or doesn't point
  // to a valid executable, it check the if 'bw' is available globally.
  async _getToolPath() {
    let localPath = await this._getSetting()
    if (localPath) {
      let local = await this._checkCommand(localPath)
      if (local) {
        return localPath
      }
    }

    let global = await this._checkCommand('bw')
    if (global) {
      return 'bw'
    }

    return null
  }

  // Checks if Bitwarden integration is configured properly by trying to
  // obtain a valid Bitwarden-CLI tool path.
  async checkIfConfigured() {
    this.path = await this._getToolPath()
    return this.path != null
  }

  // Returns current Bitwarden-CLI status. If we have a session key, then
  // password store is considered unlocked.
  isUnlocked() {
    return this.sessionKey != null
  }

  // Tries to get a list of credential suggestions for a given domain name.
  // If password store is locked, the method will try to unlock it by 
  async getSuggestions(domain) {
    if (this.lastCall != null) {
      return this.lastCall
    }

    let command = this.path
    if (!command) {
      return Promise.resolve([])
    }

    let start = null
    if (this.sessionKey == null) {
      start = this.tryToUnlock(command)
    } else {
      start = Promise.resolve(this.sessionKey)
    }

    this.lastCall = start.then(() => this.loadSuggestions(command, domain)).then(suggestions => {
      this.lastCall = null
      return suggestions
    }).catch(ex => {
      this.lastCall = null
    })

    return this.lastCall
  }

  // Loads credential suggestions for given domain name.
  async loadSuggestions(command, domain) {
    try {
      let process = new ProcessSpawner(command, ['list', 'items', '--url', domain, '--session', this.sessionKey])
      let data = await process.execute()
      const matches = JSON.parse(data)
      let credentials = matches.map(match => {
        const { login: { username, password } } = match
        return { username, password, manager: 'Bitwarden' }
      })
      return credentials
    } catch (ex) {
      const { error, data } = ex
      console.error('Error accessing Bitwarden CLI. STDOUT: ' + data + '. STDERR: ' + error)
      return []
    }
  }

  // Tries to unlock the store by asking for a master password and
  // then passing that to Bitwarden-CLI to get a session key.
  async tryToUnlock(command) {
    let password = await this.promptForMasterPassword()
    let sessionKey = await this.unlockStore(command, password)
    this.sessionKey = sessionKey
  }
  
  // Tries to unlock the password store with given master password. 
  async unlockStore(command, password) {
    try {
      let process = new ProcessSpawner(command, ['unlock', '--raw', password])
      let result = await process.execute()
      return result
    } catch (ex) {
      const { error, data } = ex
      console.error('Error accessing Bitwarden CLI. STDOUT: ' + data + '. STDERR: ' + error)
      throw ex
    }
  }

  // Shows a prompt dialog for password store's master password.
  async promptForMasterPassword() {
    return new Promise((resolve, reject) => {
      let { data: password } = ipc.sendSync('prompt', { text: 'Please enter Bitwarden master password to unlock the password store:' })
      if (password == null || password == '') {
        reject()
      } else {
        resolve(password)
      }
    })
  }
}

// List of supported password managers. Each password manager is expected to 
// have getSuggestions(domain) method that returns a Promise with credentials
// suggestions matching given domain name.
var passwordManagers = [
    new Bitwarden()
]

// Returns an active password manager, which is the one that is selected in app's
// settings. 
async function getActivePasswordManager() {
  return new Promise((resolve, reject) => {
    if (passwordManagers.length == 0) {
      resolve(null)
    }

    let managerSetting = settings.get('passwordManager')
    if (managerSetting == null) {
      resolve(null)
    }

    let manager = passwordManagers.find(mgr => mgr.name == managerSetting.name)
    resolve(manager)
  })
}

async function getConfiguredPasswordManager() {
  let manager = await getActivePasswordManager()
  if (!manager) {
    return null
  }

  let configured = await manager.checkIfConfigured()
  if (!configured) {
    return null
  }

  return manager
}

// Called when page preload script detects a form with username and password.
webviews.bindIPC('password-autofill', function (webview, tab, args, frameId) {
  getConfiguredPasswordManager().then((manager) => {
    if (!manager) {
      return
    }

    webviews.callAsync(tab, 'getURL', null, (err, src) => {
      var domain = new URL(src).hostname
      if (domain.startsWith('www.')) {
        domain = domain.slice(4)
      }
      
      var self = this
      manager.getSuggestions(domain).then(credentials => {
        if (credentials.length > 0) {
          webview.sendToFrame(frameId, 'password-autofill-match', credentials)
        }
      }).catch(e => {
        console.error('Failed to get password suggestions: ' + e.message)
      })
    })
  })
})

webviews.bindIPC('password-autofill-check', function (webview, tab, args, frameId) {
  getActivePasswordManager().then((manager) => {
    if (manager) {
      webview.sendToFrame(frameId, 'password-autofill-enabled')
    }
  })
})

