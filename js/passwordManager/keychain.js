/*
A note about the keychain storage format:
keytar saves entries as (service, account, password), but only supports listing all entries given a particular service
We need a way to find all passwords created by Min, so we use "min saved password" as the service name,
and then store both the account domain and username in the "account" field as a JS object
*/

class Keychain {
  constructor () {
    this.name = 'Built-in password manager'
    this.keychainServiceName = 'Min saved password'
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
    return ipc.invoke('keychainFindCredentials', this.keychainServiceName).then(function (results) {
      return results
        .filter(function (result) {
          try {
            return JSON.parse(result.account).domain === domain
          } catch (e) {
            return false
          }
        })
        .map(function (result) {
          return {
            username: JSON.parse(result.account).username,
            password: result.password,
            manager: 'Keychain'
          }
        })
    })
  }

  getSignInRequirements () {
    return []
  }

  saveCredential (domain, username, password) {
    ipc.invoke('keychainSetPassword', this.keychainServiceName, JSON.stringify({ domain: domain, username: username }), password)
  }

  deleteCredential (domain, username) {
    ipc.invoke('keychainDeletePassword', this.keychainServiceName, JSON.stringify({ domain: domain, username: username }))
  }

  getAllCredentials () {
    return ipc.invoke('keychainFindCredentials', this.keychainServiceName).then(function (results) {
      return results.map(function (result) {
        return {
          domain: JSON.parse(result.account).domain,
          username: JSON.parse(result.account).username,
          password: result.password,
          manager: 'Keychain'
        }
      })
    })
  }
}

module.exports = Keychain
