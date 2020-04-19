const settings = require('util/settings/settings.js')
const ProcessSpawner = require('util/process.js')

// 1Password password manager. Requires session key to unlock the vault.
class OnePassword {
  constructor() {
    this.sessionKey = null
    this.lastCallList = {}
    this.name = '1Password'
  }

  // Returns a 1Password-CLI tool path by checking possible locations.
  // First it checks if the tool was installed for Min specifically by
  // by checking the settings value. If that is not set or doesn't point
  // to a valid executable, it check the if 'bw' is available globally.
  async _getToolPath() {
    let localPath = settings.get('1PasswordPath')
    if (localPath) {
      let local = false;
      try {
        await fs.promises.access(localPath, fs.constants.X_OK)
        local = true;
      } catch (e) { }
      if (local) {
        return localPath
      }
    }

    let global = new ProcessSpawner('op').checkCommandExists()

    if (global) {
      return 'op'
    }

    return null
  }

  // Checks if 1Password integration is configured properly by trying to
  // obtain a valid 1Password-CLI tool path.
  async checkIfConfigured() {
    this.path = await this._getToolPath()
    return this.path != null
  }

  // Returns current 1Password-CLI status. If we have a session key, then
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

    if (this.sessionKey == null) {
      throw new Error();
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
  async loadSuggestions(command, domain) {
    try {
      let process = new ProcessSpawner(command, ['list', 'items', '--session=' + this.sessionKey])
      let data = await process.executeSyncInAsyncContext();

      const matches = JSON.parse(data)

      let credentials = matches.map(match => match).filter((match) => {
        try {
          var matchHost = new URL(match.overview.url).hostname
          if (matchHost.startsWith('www.')) {
            matchHost = matchHost.slice(4)
          }
          return matchHost === domain;
        } catch (e) {
          return false;
        }
      });

      var expandedCredentials = [];

      for (var i = 0; i < credentials.length; i++) {
        let item = credentials[i]
        let process = new ProcessSpawner(command, ["get", "item", item.uuid, "--session=" + this.sessionKey])
        let output = await process.executeSyncInAsyncContext()
        let credential = JSON.parse(output)
        expandedCredentials.push({
          username: credential.details.fields.filter(f => f.name == "username")[0].value,
          password: credential.details.fields.filter(f => f.name == "password")[0].value,
          manager: "1Password"
        })
      }

      return expandedCredentials
    } catch (ex) {
      const { error, data } = ex
      console.error('Error accessing 1Password CLI. STDOUT: ' + data + '. STDERR: ' + error, ex)
      return []
    }
  }

  // Tries to unlock the password store with given master password.
  async unlockStore(password) {
    try {
      let process = new ProcessSpawner(this.path, ['signin', '--raw'])
      let result = await process.executeSyncInAsyncContext(password)
      //no session key -> invalid password
      if (!result) {
        throw new Error();
      }

      this.sessionKey = result;
      return true
    } catch (ex) {
      const { error, data } = ex
      console.error('Error accessing 1Password CLI. STDOUT: ' + data + '. STDERR: ' + error)
      throw ex
    }
  }
}

module.exports = OnePassword