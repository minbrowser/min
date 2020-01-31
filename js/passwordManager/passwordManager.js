const settings = require('util/settings/settings.js')
const webviews = require('webviews.js')
const ProcessSpawner = require('util/process.js')

// Bitwarden password manager. Requires session key to unlock the vault.
class Bitwarden {
  constructor() {
    this.sessionKey = null
    this.lastCallList = {}
    this.name = 'Bitwarden'
  }

  // Checks if given command runs and produces output.
  async _checkCommand(command, args) {
    try {
      let process = new ProcessSpawner(command, args)
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
    let localPath = settings.get('bitwardenPath')
    if (localPath) {
      let local = false;
      try {
        await fs.promises.access(localPath, fs.constants.X_OK)
        local = true;
      } catch (e) {}
      if (local) {
        return localPath
      }
    }

    let global;
    if (platformType === "windows") {
      global = await this._checkCommand('where', ['bw'])
    } else {
      global = await this._checkCommand('which', ['bw'])
    }
  
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
    if (this.lastCallList[domain] != null) {
      return this.lastCallList[domain]
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

    this.lastCallList[domain] = start.then(() => this.loadSuggestions(command, domain)).then(suggestions => {
      this.lastCallList[domain] = null
      return suggestions
    }).catch(ex => {
      this.lastCallList[domain] = null
    })

    return this.lastCallList[domain]
  }

  // Loads credential suggestions for given domain name.
  async loadSuggestions(command, domain) {
    try {
      let process = new ProcessSpawner(command, ['list', 'items', '--url', this.sanitize(domain), '--session', this.sessionKey])
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
    let sessionKey = null
    while (!sessionKey) {
      let password
      try {
      password = await this.promptForMasterPassword()
      } catch (e) {
        //dialog was canceled
        break
      }
      try {
      sessionKey = await this.unlockStore(command, password)
      } catch (e) {
        //incorrect password, prompt again
      }
    }
    this.sessionKey = sessionKey
    this.forceSync(command)
  }

  async forceSync(command) {
    try {
      let process = new ProcessSpawner(command, ['sync', '--session', this.sessionKey])
      await process.execute()
    } catch (ex) {
      const { error, data } = ex
      console.error('Error accessing Bitwarden CLI. STDOUT: ' + data + '. STDERR: ' + error)
      throw ex
    }
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
      let {password} = ipc.sendSync('prompt', {
         text: l('passwordManagerUnlock').replace("%p", "Bitwarden"),
         values: [{ placeholder: l('password'), id: 'password', type: 'password' }],
         ok: l('dialogConfirmButton'),
         cancel: l('dialogSkipButton'),
         height: 160,
        })
      if (password == null || password == '') {
        reject()
      } else {
        resolve(password)
      }
    })
  }

  // Basic domain name cleanup. Removes any non-ASCII symbols.
  sanitize(domain) {
    return domain.replace(/[^a-zA-Z0-9.-]/g, '')
  }
}

const PasswordManagers = {
  // List of supported password managers. Each password manager is expected to
  // have getSuggestions(domain) method that returns a Promise with credentials
  // suggestions matching given domain name.
  managers: [
    new Bitwarden()
  ],
  // Returns an active password manager, which is the one that is selected in app's
  // settings.
  getActivePasswordManager: function () {
    if (PasswordManagers.managers.length == 0) {
      return null
    }

    let managerSetting = settings.get('passwordManager')
    if (managerSetting == null) {
      return null
    }

    return PasswordManagers.managers.find(mgr => mgr.name == managerSetting.name)
  },
  getConfiguredPasswordManager: async function () {
    let manager = PasswordManagers.getActivePasswordManager()
    if (!manager) {
      return null
    }

    let configured = await manager.checkIfConfigured()
    if (!configured) {
      return null
    }

    return manager
  },
  // Binds IPC events.
  initialize: function () {
    // Called when page preload script detects a form with username and password.
    webviews.bindIPC('password-autofill', function (webview, tab, args, frameId) {
      // We expect hostname of the source page/frame as a parameter.
      if (args.length == 0) {
        return
      }
      let hostname = args[0]

      PasswordManagers.getConfiguredPasswordManager().then((manager) => {
        if (!manager) {
          return
        }

        var domain = hostname
        if (domain.startsWith('www.')) {
          domain = domain.slice(4)
        }

        var self = this
        manager.getSuggestions(domain).then(credentials => {
          if (credentials != null) {
            webviews.callAsync(tab, 'getURL', null, function (err, topLevelURL) {
              var topLevelDomain = new URL(topLevelURL).hostname
              if (topLevelDomain.startsWith('www.')) {
                topLevelDomain = topLevelDomain.slice(4)
              }
              if (domain !== topLevelDomain) {
                console.warn("autofill isn't supported for 3rd-party frames")
                return;
              }
              webview.sendToFrame(frameId, 'password-autofill-match', {
                credentials,
                hostname
              })
            })
          }
        }).catch(e => {
          console.error('Failed to get password suggestions: ' + e.message)
        })
      })
    })

    webviews.bindIPC('password-autofill-check', function (webview, tab, args, frameId) {
      if (PasswordManagers.getActivePasswordManager()) {
        webview.sendToFrame(frameId, 'password-autofill-enabled')
      }
    })
  }
}

module.exports = PasswordManagers
