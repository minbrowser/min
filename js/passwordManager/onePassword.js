const ProcessSpawner = require('util/process.js')
const path = require('path')
const fs = require('fs')

// 1Password password manager. Requires session key to unlock the vault.
class OnePassword {
  constructor () {
    this.sessionKey = null
    this.sessionKeyCreated = 0
    // https://support.1password.com/command-line/
    // "Sessions automatically expire after 30 minutes of inactivity"
    this.sessionKeyLifetime = 30 * 60 * 1000
    this.lastCallList = {}
    this.name = '1Password'
  }

  getDownloadLink () {
    switch (window.platformType) {
      case 'mac':
        return 'https://cache.agilebits.com/dist/1P/op/pkg/v0.10.0/op_darwin_amd64_v0.10.0.pkg'
      case 'windows':
        return 'https://cache.agilebits.com/dist/1P/op/pkg/v0.10.0/op_windows_amd64_v0.10.0.zip'
      case 'linux':
        return 'https://cache.agilebits.com/dist/1P/op/pkg/v0.10.0/op_linux_amd64_v0.10.0.zip'
    }
  }

  getLocalPath () {
    return path.join(window.globalArgs['user-data-path'], 'tools', (platformType === 'windows' ? 'op.exe' : 'op'))
  }

  getSetupMode () {
    return (platformType === 'mac') ? 'installer' : 'dragdrop'
  }

  // Returns a 1Password-CLI tool path by checking possible locations.
  // First it checks if the tool was installed for Min specifically
  // by checking the settings value. If that is not set or doesn't point
  // to a valid executable, it checks if 'op' is available globally.
  async _getToolPath () {
    const localPath = this.getLocalPath()
    if (localPath) {
      let local = false
      try {
        await fs.promises.access(localPath, fs.constants.X_OK)
        local = true
      } catch (e) { }
      if (local) {
        return localPath
      }
    }

    const global = await new ProcessSpawner('op').checkCommandExists()

    if (global) {
      return 'op'
    }

    return null
  }

  // Checks if 1Password integration is configured properly by trying to
  // obtain a valid 1Password-CLI tool path.
  async checkIfConfigured () {
    this.path = await this._getToolPath()
    return this.path != null
  }

  // Returns current 1Password-CLI status. If we have a session key, then
  // password store is considered unlocked.
  isUnlocked () {
    return this.sessionKey !== null && (Date.now() - this.sessionKeyCreated) < this.sessionKeyLifetime
  }

  // Tries to get a list of credential suggestions for a given domain name.
  async getSuggestions (domain) {
    if (this.lastCallList[domain] != null) {
      return this.lastCallList[domain]
    }

    const command = this.path
    if (!command) {
      return Promise.resolve([])
    }

    if (!this.isUnlocked()) {
      throw new Error()
    }

    this.lastCallList[domain] = this.loadSuggestions(command, domain).then(suggestions => {
      this.lastCallList[domain] = null
      return suggestions
    }).catch(ex => {
      this.lastCallList[domain] = null
    })

    return this.lastCallList[domain]
  }

  // Loads credential suggestions for given domain name.
  async loadSuggestions (command, domain) {
    try {
      const process = new ProcessSpawner(command, ['list', 'items', '--session=' + this.sessionKey])
      const data = await process.executeSyncInAsyncContext()

      const matches = JSON.parse(data)

      const credentials = matches.map(match => match).filter((match) => {
        try {
          var matchHost = new URL(match.overview.url).hostname
          if (matchHost.startsWith('www.')) {
            matchHost = matchHost.slice(4)
          }
          return matchHost === domain
        } catch (e) {
          return false
        }
      })

      var expandedCredentials = []

      for (var i = 0; i < credentials.length; i++) {
        const item = credentials[i]
        const process = new ProcessSpawner(command, ['get', 'item', item.uuid, '--session=' + this.sessionKey])
        const output = await process.executeSyncInAsyncContext()
        const credential = JSON.parse(output)

        var usernameFields = credential.details.fields.filter(f => f.designation === 'username')
        var passwordFields = credential.details.fields.filter(f => f.designation === 'password')

        if (usernameFields.length > 0 && passwordFields.length > 0) {
          expandedCredentials.push({
            username: usernameFields[0].value,
            password: passwordFields[0].value,
            manager: '1Password'
          })
        }
      }

      return expandedCredentials
    } catch (ex) {
      const { error, data } = ex
      console.error('Error accessing 1Password CLI. STDOUT: ' + data + '. STDERR: ' + error, ex)
      return []
    }
  }

  // Tries to unlock the password store with given master password.
  async unlockStore (password) {
    try {
      const process = new ProcessSpawner(this.path, ['signin', '--raw'])
      const result = await process.executeSyncInAsyncContext(password)
      // no session key -> invalid password
      if (!result) {
        throw new Error()
      }

      this.sessionKey = result
      this.sessionKeyCreated = Date.now()
      return true
    } catch (ex) {
      const { error, data } = ex
      console.error('Error accessing 1Password CLI. STDOUT: ' + data + '. STDERR: ' + error)
      throw ex
    }
  }

  getSignInRequirements () {
    return ['email', 'password', 'secretKey']
  }

  async signInAndSave (credentials, path = this.path) {
    // It's possible to be already logged in
    const logoutProcess = new ProcessSpawner(path, ['signout'])
    try {
      await logoutProcess.executeSyncInAsyncContext()
    } catch (e) {
      console.warn(e)
    }
    const process = new ProcessSpawner(path, ['signin', '--raw', 'my.1password.com', credentials.email, credentials.secretKey])

    const key = await process.executeSyncInAsyncContext(credentials.password)
    if (!key) {
      throw new Error()
    }

    return true
  }
}

module.exports = OnePassword
