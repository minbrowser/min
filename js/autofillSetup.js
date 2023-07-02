const setupDialog = require('passwordManager/managerSetup.js')
const settings = require('util/settings/settings.js')
const PasswordManagers = require('passwordManager/passwordManager.js')

async function checkSettings () {
  const manager = PasswordManagers.getActivePasswordManager()

  if (!manager) {
    return
  }

  try {
    const configured = await manager.checkIfConfigured()
    if (!configured) {
      setupDialog.show(manager)
    }
  } catch (e) {
    console.error(e)
  }
}

function initialize () {
  settings.listen('passwordManager', manager => {
    if (!manager) {
      return
    }
    checkSettings()
  })
}

module.exports = { initialize }
