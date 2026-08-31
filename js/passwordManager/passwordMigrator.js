const { ipcRenderer } = require('electron')
const PasswordManagers = require('passwordManager/passwordManager.js')
const places = require('places/places.js')
const settings = require('util/settings/settings.js')

class PasswordMigrator {
  #currentVersion = 2;

  constructor() {
    this.startMigration()
  }

  async _isOutdated(version) {
    return version < this.#currentVersion
  }

  async _getInUseCredentialVersion() {
    const version = await ipcRenderer.invoke('credentialStoreGetVersion')
    return version
  }

  async startMigration() {
    const inUseVersion = await this._getInUseCredentialVersion()
    const isOutdated = await this._isOutdated(inUseVersion)
    if (!isOutdated) return

    try {
      if (inUseVersion === 1 && this.#currentVersion === 2) {
        await this.migrateVersion1to2()
        console.log('[PasswordMigrator]: Migration complete.')
        return
      }
    } catch (error) {
      console.error('Error during password migration:', error)
    }
  }

  async migrateVersion1to2() {
    console.log('[PasswordMigrator]: Migrating keychain data to version', this.#currentVersion)

    const passwordManager = await PasswordManagers.getConfiguredPasswordManager()
    if (!passwordManager || !passwordManager.getAllCredentials) {
      throw new Error('Incompatible password manager')
    }

    const historyData = await places.getAllItems()
    const currentCredentials = await passwordManager.getAllCredentials()
    console.log('[PasswordMigrator]: Found', historyData.length, 'history entries', historyData)
    console.log('[PasswordMigrator]: Found', currentCredentials.length, 'credentials in the current password manager', currentCredentials)

    function createNewCredential(credential) {
      // 1) check if the saved url has been visited, if so use that url
      const historyEntry = historyData.find(entry => new URL(entry.url).host.replace(/^(https?:\/\/)?(www\.)?/, '') === credential.domain.replace(/^(https?:\/\/)?(www\.)?/, ''))
      if (historyEntry) {
        return {
          username: credential.username,
          password: credential.password,
          url: new URL(historyEntry.url).origin
        }
      } 

      // 2) check if domain has protocol, if not, add 'https://'
      if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        newUrl = `https://${newUrl}`
      }

      return {
        username: credential.username,
        password: credential.password,
        url: newUrl
      };
    }

    const migratedCredentials = currentCredentials.map(createNewCredential)
    console.log('[PasswordMigrator]: Migrated', migratedCredentials.length, 'credentials', migratedCredentials);

    const neverSavedCredentials = settings.get('passwordsNeverSaveDomains') || []
    console.log('[PasswordMigrator]: Found', neverSavedCredentials.length, 'never-saved credentials', neverSavedCredentials)
    const migratedNeverSavedCredentials = neverSavedCredentials.map(createNewCredential)
    settings.set('passwordsNeverSaveDomains', migratedNeverSavedCredentials)
    console.log('[PasswordMigrator]: Migrated', migratedNeverSavedCredentials.length, 'never-saved credentials', migratedNeverSavedCredentials)

    await ipcRenderer.invoke('credentialStoreSetPasswordBulk', migratedCredentials)

    // finally upate the version
    await ipcRenderer.invoke('credentialStoreSetVersion', this.#currentVersion)
  }
}

function initialize() {
  new PasswordMigrator()
}

module.exports = { initialize }
