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
    const filePaths = await ipcRenderer.invoke('showOpenDialog', {
      filters: [
        { name: 'CSV', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!filePaths || !filePaths[0]) return []

    try {
      const file = fs.readFileSync(filePaths[0], 'utf8')
      const lines = file.split('\n')
      const credentialsToImport = lines.slice(1).map(line => {
        const values = line.split(',')
        if (values.length !== 3 || values.some(value => value === '')) return null
        return {
          domain: values[0],
          username: values[1],
          password: values[2]
        }
      }).filter(cred => cred !== null)

      if (credentialsToImport.length === 0) return []

      const currentCredentials = await this.getAllCredentials()
      const credentialsWithoutDuplicates = currentCredentials.filter(account => !credentialsToImport.some(a => a.domain === account.domain && a.username === account.username))

      const mergedCredentials = credentialsWithoutDuplicates.concat(credentialsToImport)

      await ipcRenderer.invoke('credentialStoreSetPasswordBulk', mergedCredentials)
      return mergedCredentials
    } catch (error) {
      console.error('Error importing credentials:', error)
      return []
    }
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
