const { ipcRenderer } = require('electron')

class Keychain {
  constructor () {
    this.name = 'Built-in password manager'
  }

  getDownloadLink () {
    return null
  }

  getLocalPath () {
    return null
  }

  getSetupMode () {
    return null
  }

  async checkIfConfigured () {
    return true
  }

  isUnlocked () {
    return true
  }

  async getSuggestions (domain) {
    return ipcRenderer.invoke('credentialStoreGetCredentials').then(function (results) {
      return results
        .filter(function (result) {
          return result.domain === domain
        })
        .map(function (result) {
          return {
            ...result,
            manager: 'Keychain'
          }
        })
    })
  }

  saveCredential (domain, username, password) {
    ipcRenderer.invoke('credentialStoreSetPassword', { domain, username, password })
  }

  deleteCredential (domain, username) {
    ipcRenderer.invoke('credentialStoreDeletePassword', { domain, username })
  }

  async importCredentials () {
    const filePaths = await ipc.invoke('showOpenDialog', {
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!filePaths[0]) return

    const file = fs.readFileSync(filePaths[0])
    const { credentials } = JSON.parse(file)
    if (credentials.length === 0 || !credentials[0].domain || !credentials[0].username || !credentials[0].password) {
      return []
    }

    ipcRenderer.invoke('credentialStoreSetPasswordBulk', credentials)

    return credentials
  }

  getAllCredentials () {
    return ipcRenderer.invoke('credentialStoreGetCredentials').then(function (results) {
      return results.map(function (result) {
        return {
          ...result,
          manager: 'Keychain'
        }
      })
    })
  }
}

module.exports = Keychain
