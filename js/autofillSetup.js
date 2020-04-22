const setupDialog = require('passwordManager/managerSetup.js')
const settings = require('util/settings/settings.js')
const PasswordManagers = require('passwordManager/passwordManager.js')

const AutofillSetup = {
  checkSettings: function () {
    let manager = PasswordManagers.getActivePasswordManager()
    if (!manager) {
      return
    }

    manager.checkIfConfigured().then((configured) => {
      let setupMethod = 'dragdrop'
      if (platformType === 'mac' && manager.name === '1Password') {
        setupMethod = 'installer'
      }
      if (!configured) {
        setupDialog.show(manager, setupMethod)
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
