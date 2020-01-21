const showBitwardenDialog = require('passwordManager/bitwardenSetup.js')
const settings = require('util/settings/settings.js')
const PasswordManagers = require('passwordManager/passwordManager.js')

const AutofillSetup = {
  checkSettings: function () {
    let manager = PasswordManagers.getActivePasswordManager()
    if (!manager) {
      return
    }

    manager.checkIfConfigured().then((configured) => {
      return { manager, configured }
    }).then((result) => {
      const { manager, configured } = result
      if (manager && !configured) {
        if (manager.name === 'Bitwarden') {
          showBitwardenDialog()
        }
      }
    }).catch((err) => {
      console.error(err)
    })
  },
  initialize: function () {
    settings.listen('passwordManager', function (manager) {
      if (manager) {
        // Trigger the check on browser launch and after manager is enabled
        AutofillSetup.checkSettings()
      }
    })
  }
}

module.exports = AutofillSetup
