const settings = require('util/settings/settings.js')
const ProcessSpawner = require('util/process.js')

// Bitwarden password manager. Requires session key to unlock the vault.
class Bitwarden {
  constructor() {
    this.sessionKey = null
    this.lastCallList = {}
    this.name = 'Bitwarden'
  }

  getDownloadLink() {
    switch (window.platformType) {
      case 'mac':
        return 'https://vault.bitwarden.com/download/?app=cli&platform=macos'
        break;
      case 'windows':
        return 'https://vault.bitwarden.com/download/?app=cli&platform=windows'
        break;
      case 'linux':
        return 'https://vault.bitwarden.com/download/?app=cli&platform=linux'
        break;
    }
  }
  
  getFileName() {
    return (platformType === 'windows' ? 'bw.exe' : 'bw')
  }

  getSetupMode() {
    return 'dragdrop'
  }

  // Returns a Bitwarden-CLI tool path by checking possible locations.
  // First it checks if the tool was installed for Min specifically
  // by checking the settings value. If that is not set or doesn't point
  // to a valid executable, it checks if 'bw' is available globally.
  async _getToolPath() {
    let localPath = settings.get('bitwardenPath')
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

    let global = await new ProcessSpawner('bw').checkCommandExists()

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
  async unlockStore(password) {
    try {
      let process = new ProcessSpawner(this.path, ['unlock', '--raw', password])
      let result = await process.execute()

      if (!result) {
        throw new Error();
      }

      this.sessionKey = result;
      return true
    } catch (ex) {
      const { error, data } = ex
      console.error('Error accessing Bitwarden CLI. STDOUT: ' + data + '. STDERR: ' + error)
      throw ex
    }
  }

  getSignInRequirements() {
    return ["email", "password"]
  }

  async signInAndSave(credentials, path = this.path) {
    // It's possible to be already logged in
    let logoutProcess = new ProcessSpawner(path, ['logout'])
    try {
      await logoutProcess.execute();
    } catch (e) {
      console.warn(e);
    }
    let process = new ProcessSpawner(path, ['login', '--raw', credentials.email, credentials.password])

    await process.execute()

    settings.set('bitwardenPath', path)
    return true
  }

  // Basic domain name cleanup. Removes any non-ASCII symbols.
  sanitize(domain) {
    return domain.replace(/[^a-zA-Z0-9.-]/g, '')
  }
}

module.exports = Bitwarden