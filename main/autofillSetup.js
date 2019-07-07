/** 
This script shows additional password manager setup dialog when IPC
receives 'autofill-setup' event. The event data should contain password
manager's name.
 
Dialog is expected to send several events during it's lifecycle:
 
autofill-link: indicates that we should load an URL in main window. Intended
use is to allow user to see some additional info about given password manager.
  
autofill-close: returns a boolean value indicating whether setup went as 
expected or not. 'false' value would indicate that we should disable autofill 
in settings because of some setup problems.
*/

// Holds result of the setup attempt.
var setupResult = null

var dialogWindow = null

function createSetupDialog(options, callback) {
  const { manager } = options
  dialogWindow = new BrowserWindow({
    width: 600, 
    height: 550, 
    parent: mainWindow,
    show: false,
    modal: false,
    alwaysOnTop : true, 
    title : null,
    autoHideMenuBar: true,
    frame: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: { 
      nodeIntegration: true,
      sandbox: false 
    }   
  })

  dialogWindow.setMenu(null)

  dialogWindow.on('closed', () => { 
    dialogWindow = null 
    callback(setupResult)
  })

  // Load the HTML dialog box
  dialogWindow.loadURL('file://' + __dirname + '/pages/autofillSetup/' + manager + '/index.html')
  dialogWindow.once('ready-to-show', () => { dialogWindow.show() })
}

ipc.on('autofill-open', function(event) {
  event.returnValue = {
    parent: dialogWindow
  }
})

ipc.on('autofill-close', function(event, data) {
  setupResult = !data
})

ipc.on('autofill-link', function(event, data) {
  openTabInWindow(data)
})

ipc.on('autofill-setup', function(event, data) {
  createSetupDialog(data, function (shouldDisable) {
    // Dialog was canceled.
    if (shouldDisable == null) {
      return
    }

    // Setup failed.
    if (shouldDisable) {
      settings.set('passwordManager', null)
    }

    // Reload settings.
    event.sender.send('password-autofill-reload')
  })
})
