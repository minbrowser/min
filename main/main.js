const electron = require('electron')
const fs = require('fs')
const path = require('path')
const app = electron.app // Module to control application life.
const protocol = electron.protocol // Module to control protocol handling
const BrowserWindow = electron.BrowserWindow // Module to create native browser window.
const webContents = electron.webContents
const session = electron.session
const ipc = electron.ipcMain
const Menu = electron.Menu
const MenuItem = electron.MenuItem

let isInstallerRunning = false;

function clamp(n, min, max) {
  return Math.max(Math.min(n, max), min);
}

if (process.platform === 'win32') {
  (async function () {
  var squirrelCommand = process.argv[1];
  if (squirrelCommand === "--squirrel-install" || squirrelCommand === "--squirrel-updated") {
    isInstallerRunning = true;
    await registryInstaller.install();
  }
  if (squirrelCommand == '--squirrel-uninstall') {
    isInstallerRunning = true;
    await registryInstaller.uninstall();
  }
  if (require('electron-squirrel-startup')) {
    app.quit()
  }
  })();
}

// workaround for flicker when focusing app (https://github.com/electron/electron/issues/17942)
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true')

var userDataPath = app.getPath('userData')

var dbPath = userDataPath + (process.platform === 'win32' ? '\\IndexedDB\\file__0.indexeddb.leveldb' : '/IndexedDB/file__0.indexeddb.leveldb')

if (process.argv.some(item => item.includes('rename-db'))) {
  try {
    fs.renameSync(dbPath, dbPath + '-' + Date.now() + '.recovery')
  } catch (e) {
    console.warn('renaming database failed', e)
    app.quit()
  }
}

const browserPage = 'file://' + __dirname + '/index.html'

var mainWindow = null
var mainMenu = null
var secondaryMenu = null;
var isFocusMode = false
var appIsReady = false

const isFirstInstance = app.requestSingleInstanceLock()

if (!isFirstInstance) {
  app.quit()
}

var saveWindowBounds = function () {
  if (mainWindow) {
    var bounds = Object.assign(mainWindow.getBounds(), {
      maximized: mainWindow.isMaximized()
    })
    fs.writeFileSync(path.join(userDataPath, 'windowBounds.json'), JSON.stringify(bounds))
  }
}

function sendIPCToWindow (window, action, data) {
  // if there are no windows, create a new one
  if (!mainWindow) {
    createWindow(function () {
      mainWindow.webContents.send(action, data || {})
    })
  } else {
    mainWindow.webContents.send(action, data || {})
  }
}

function openTabInWindow (url) {
  sendIPCToWindow(mainWindow, 'addTab', {
    url: url
  })
}

function handleCommandLineArguments (argv) {
  // the "ready" event must occur before this function can be used
  if (argv) {
    argv.forEach(function (arg, idx) {
      if (arg && arg.toLowerCase() !== __dirname.toLowerCase()) {
        //URL
        if (arg.indexOf('://') !== -1) {
          sendIPCToWindow(mainWindow, 'addTab', {
            url: arg
          })
        } else if (arg.includes(' ') || (idx > 0 && argv[idx - 1] === '-s')) {
          //search
          sendIPCToWindow(mainWindow, 'addTab', {
            url: arg
          })
        } else if (/[A-Z]:[/\\].*\.html?$/.test(arg)) {
          //local files on Windows
          sendIPCToWindow(mainWindow, 'addTab', {
            url: "file://" + arg
          })
        }
      }
    })
  }
}

function createWindow (cb) {
  var savedBounds = fs.readFile(path.join(userDataPath, 'windowBounds.json'), 'utf-8', function (e, data) {
    var bounds

    if (data) {
      try {
        bounds = JSON.parse(data)
      } catch (e) {
        console.warn('error parsing window bounds file: ', e)
      }
    }
    if (e || !data || !bounds) { // there was an error, probably because the file doesn't exist
      var size = electron.screen.getPrimaryDisplay().workAreaSize
      bounds = {
        x: 0,
        y: 0,
        width: size.width,
        height: size.height,
        maximized: true,
      }
    }

    //make the bounds fit inside a currently-active screen
    //(since the screen Min was previously open on could have been removed)
    //see: https://github.com/minbrowser/min/issues/904
    var containingRect = electron.screen.getDisplayMatching(bounds).workArea;

    bounds = {
      x: clamp(bounds.x, containingRect.x, (containingRect.x + containingRect.width) - bounds.width),
      y: clamp(bounds.y, containingRect.y, (containingRect.y + containingRect.height) - bounds.height),
      width: clamp(bounds.width, 0, containingRect.width),
      height: clamp(bounds.height, 0, containingRect.height),
      maximized: bounds.maximized
    }

    createWindowWithBounds(bounds)

    if (cb) {
      cb()
    }
  })
}

function createWindowWithBounds (bounds) {
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: (process.platform === 'win32' ? 400 : 320), // controls take up more horizontal space on Windows
    minHeight: 350,
    titleBarStyle: 'hiddenInset',
    icon: __dirname + '/icons/icon256.png',
    frame: process.platform === 'darwin' || settings.get('useSeparateTitlebar') === true,
    alwaysOnTop: settings.get('windowAlwaysOnTop'),
    backgroundColor: '#fff', // the value of this is ignored, but setting it seems to work around https://github.com/electron/electron/issues/10559
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true, //used by ProcessSpawner
      additionalArguments: ['--user-data-path=' + userDataPath, '--app-version=' + app.getVersion()]
    }
  })

  // windows and linux always use a menu button in the upper-left corner instead
  // if frame: false is set, this won't have any effect, but it does apply on Linux if "use separate titlebar" is enabled
  if (process.platform !== 'darwin') {
    mainWindow.setMenuBarVisibility(false);
  }

  // and load the index.html of the app.
  mainWindow.loadURL(browserPage)

  if (bounds.maximized) {
    mainWindow.maximize()

    mainWindow.webContents.on('did-finish-load', function () {
      sendIPCToWindow(mainWindow, 'maximize')
    })
  }

  mainWindow.on('close', function () {
    destroyAllViews()
    // save the window size for the next launch of the app
    saveWindowBounds()
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  mainWindow.on('focus', function () {
    sendIPCToWindow(mainWindow, 'windowFocus')
  })

  mainWindow.on('minimize', function () {
    sendIPCToWindow(mainWindow, 'minimize')
  })

  mainWindow.on('maximize', function () {
    sendIPCToWindow(mainWindow, 'maximize')
  })

  mainWindow.on('unmaximize', function () {
    sendIPCToWindow(mainWindow, 'unmaximize')
  })

  mainWindow.on('enter-full-screen', function () {
    sendIPCToWindow(mainWindow, 'enter-full-screen')
  })

  mainWindow.on('leave-full-screen', function () {
    sendIPCToWindow(mainWindow, 'leave-full-screen')
  })

  mainWindow.on('enter-html-full-screen', function () {
    sendIPCToWindow(mainWindow, 'enter-html-full-screen')
  })

  mainWindow.on('leave-html-full-screen', function () {
    sendIPCToWindow(mainWindow, 'leave-html-full-screen')
  })

  /*
  Handles events from mouse buttons
  Unsupported on macOS, and on Linux, there is a default handler already,
  so registering a handler causes events to happen twice.
  See: https://github.com/electron/electron/issues/18322
  */
  if (process.platform === 'win32') {
    mainWindow.on('app-command', function (e, command) {
      if (command === 'browser-backward') {
        sendIPCToWindow(mainWindow, 'goBack')
      } else if (command === 'browser-forward') {
        sendIPCToWindow(mainWindow, 'goForward')
      }
    })
  }

  // prevent remote pages from being loaded using drag-and-drop, since they would have node access
  mainWindow.webContents.on('will-navigate', function (e, url) {
    if (url !== browserPage) {
      e.preventDefault()
    }
  })

  return mainWindow
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
  appIsReady = true

  /* the installer launches the app to install registry items and shortcuts, 
  but if that's happening, we shouldn't display anything */
  if(isInstallerRunning) {
    return
  }

  createWindow(function () {
    mainWindow.webContents.on('did-finish-load', function () {
      // if a URL was passed as a command line argument (probably because Min is set as the default browser on Linux), open it.
      handleCommandLineArguments(process.argv)

      // there is a URL from an "open-url" event (on Mac)
      if (global.URLToOpen) {
        // if there is a previously set URL to open (probably from opening a link on macOS), open it
        sendIPCToWindow(mainWindow, 'addTab', {
          url: global.URLToOpen
        })
        global.URLToOpen = null
      }
    })
  })

  mainMenu = buildAppMenu();
  Menu.setApplicationMenu(mainMenu)
  createDockMenu()
  registerProtocols()
})

app.on('open-url', function (e, url) {
  if (appIsReady) {
    sendIPCToWindow(mainWindow, 'addTab', {
      url: url
    })
  } else {
    global.URLToOpen = url // this will be handled later in the createWindow callback
  }
})

app.on('second-instance', function (e, argv, workingDir) {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
    // add a tab with the new URL
    handleCommandLineArguments(argv)
  }
})

/**
 * Emitted when the application is activated, which usually happens when clicks on the applications's dock icon
 * https://github.com/electron/electron/blob/master/docs/api/app.md#event-activate-os-x
 *
 * Opens a new tab when all tabs are closed, and min is still open by clicking on the application dock icon
 */
app.on('activate', function (/* e, hasVisibleWindows */) {
  if (!mainWindow && appIsReady) { // sometimes, the event will be triggered before the app is ready, and creating new windows will fail
    createWindow()
  }
})

ipc.on('focusMainWebContents', function () {
  mainWindow.webContents.focus()
})

ipc.on('showSecondaryMenu', function (event, data) {
  if (!secondaryMenu) {
    secondaryMenu = buildAppMenu({secondary: true})
  }
  secondaryMenu.popup({
    x: data.x,
    y: data.y
  })
})

function registerProtocols () {
  protocol.registerStringProtocol('mailto', function (req, cb) {
    electron.shell.openExternal(req.url)
    return null
  })
}
