function checkAutofillSettings() {
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
      ipc.send('autofill-setup', { manager : manager.name }) 
    }
  })
}

// This handler will check autofill/password settings again after setup 
// is finished. There's a possibility that it will fail, which will trigger
// the setup dialog again. Thus it is important for a setup dialog to have
// a 'disable' option, allowing user to end this cycle...
ipc.on('password-autofill-reload', checkAutofillSettings)

// Trigger the check on browser launch.
checkAutofillSettings()
