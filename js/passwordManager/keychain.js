const { ipcRenderer } = require('electron')
const papaparse = require('papaparse')

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

  async getSuggestions (url) {
    var urlObj = new URL(url)
    return ipcRenderer.invoke('credentialStoreGetCredentials').then(function (results) {
      return results
        .filter(function (result) {
          return (
            (result.domain === urlObj.hostname || ('www.' + result.domain === urlObj.domain)) &&
            (!result.protocol || result.protocol === urlObj.protocol))
        })
        .map(function (result) {
          return {
            ...result,
            manager: 'Keychain'
          }
        })
    })
  }

  saveCredential (url, username, password) {
    var urlObj = new URL(url)
    ipcRenderer.invoke('credentialStoreSetPassword', {
      protocol: urlObj.protocol,
      domain: urlObj.hostname,
      username,
      password
    })
  }

  deleteCredential (credential) {
    ipcRenderer.invoke('credentialStoreDeletePassword', credential)
  }

  async importCredentials (fileContents) {
    try {
      const csvData = papaparse.parse(fileContents, {
        header: true,
        skipEmptyLines: true,
        transformHeader (header) {
          return header.toLowerCase().trim().replace(/["']/g, '')
        }
      })
      const credentialsToImport = csvData.data.map((credential) => {
        try {
          const includesProtocol = credential.url.match(/^https?:\/\//g)
          const domainWithProtocol = includesProtocol ? credential.url : `https://${credential.url}`
          const urlObj = new URL(domainWithProtocol)

          return {
            domain: urlObj.hostname,
            protocol: urlObj.protocol,
            username: credential.username,
            password: credential.password
          }
        } catch {
          return null
        }
      }).filter(credential => credential !== null)

      if (credentialsToImport.length === 0) return []

      const currentCredentials = await this.getAllCredentials()
      const credentialsWithoutDuplicates = currentCredentials.filter(account => !credentialsToImport.some(a => a.domain === account.domain && a.username === account.username && a.protocol === account.protocol))

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
