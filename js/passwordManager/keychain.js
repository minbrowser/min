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
    return ipc.invoke('keychainFindCredentials', domain).then(function (results) {
      return results.map(function (result) {
        return {
          username: result.account,
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
    ipc.invoke('keychainSetPassword', domain, username, password)
  }
}

module.exports = Keychain
