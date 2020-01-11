var showBitwardenDialog = require('passwordManager/bitwardenSetup.js')

function checkAutofillSettings () {
  getActivePasswordManager().then((manager) => {
    if (!manager) {
      return { manager: null, configured: false }
    }

    return manager.checkIfConfigured().then((configured) => {
      return { manager, configured }
    })
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
}

settings.listen('passwordManager', function (manager) {
  if (manager) {
    // Trigger the check on browser launch and after manager is enabled
    checkAutofillSettings()
  }
})
