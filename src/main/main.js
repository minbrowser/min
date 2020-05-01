import {
    app,
    protocol,
    ipcMain as ipc,
    Menu,
    shell
} from 'electron'
import fs from 'fs'

// import debug from 'electron-debug'

// debug()

import { isWindows, isDarwin } from './utils'
import g from './global'
import registryInstaller from './registryConfig'
import { buildAppMenu, createDockMenu } from './menu'
import { createWindow, sendIPCToWindow } from './windowUtils'

console.log(__dirname)

if (isWindows) {
    (async () => {
        const squirrelCommand = process.argv[1]

        if (squirrelCommand === '--squirrel-install' || squirrelCommand === '--squirrel-updated') {
            await registryInstaller.install()
        }

        if (squirrelCommand === '--squirrel-uninstall') {
            await registryInstaller.uninstall()
        }

        if (require('electron-squirrel-startup')) {
            app.quit()
        }
    })()
}

// workaround for flicker when focusing app (https://github.com/electron/electron/issues/17942)
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true')

const userDataPath = app.getPath('userData')
const dbPath = userDataPath + (isWindows ? '\\IndexedDB\\file__0.indexeddb.leveldb' : '/IndexedDB/file__0.indexeddb.leveldb')

if (process.argv.some(item => item.includes('rename-db'))) {
    try {
        fs.renameSync(dbPath, dbPath + '-' + Date.now() + '.recovery')
    } catch (e) {
        console.warn('renaming database failed', e)
        app.quit()
    }
}

const isFirstInstance = app.requestSingleInstanceLock()

if (!isFirstInstance) {
    app.quit()
}

const handleCommandLineArguments = (argv) => {
    // the 'ready' event must occur before this function can be used
    if (argv) {
        argv.forEach((arg) => {
            if (arg && arg.toLowerCase() !== __dirname.toLowerCase()) {
                if (arg.indexOf('://') !== -1) {
                    sendIPCToWindow(g.mainWindow, 'addTab', {
                        url: arg
                    })
                } else if (/[A-Z]:[/\\].*\.html?$/.test(arg)) {
                    // local files on Windows
                    sendIPCToWindow(g.mainWindow, 'addTab', {
                        url: 'file://' + arg
                    })
                }
            }
        })
    }
}

const registerProtocols = () => {
    protocol.registerStringProtocol('mailto', (req, cb) => {
        shell.openExternal(req.url)
        return null
    })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isDarwin) {
        app.quit()
    }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
    g.appIsReady = true

    createWindow(() => {
        g.mainWindow.webContents.on('did-finish-load', () => {
            // if a URL was passed as a command line argument (probably because Min is set as the default browser on Linux), open it.
            handleCommandLineArguments(process.argv)

            // there is a URL from an 'open-url' event (on Mac)
            if (global.URLToOpen) {
                // if there is a previously set URL to open (probably from opening a link on macOS), open it
                sendIPCToWindow(g.mainWindow, 'addTab', {
                    url: global.URLToOpen
                })

                global.URLToOpen = null
            }
        })
    })

    g.mainMenu = buildAppMenu()
    Menu.setApplicationMenu(g.mainMenu)
    createDockMenu()
    registerProtocols()
})

app.on('open-url', (e, url) => {
    if (g.appIsReady) {
        sendIPCToWindow(g.mainWindow, 'addTab', {
            url: url
        })
    } else {
        global.URLToOpen = url // this will be handled later in the createWindow callback
    }
})

app.on('second-instance', (e, argv, workingDir) => {
    if (g.mainWindow) {
        if (g.mainWindow.isMinimized()) {
            g.mainWindow.restore()
        }
        g.mainWindow.focus()
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
app.on('activate', (/* e, hasVisibleWindows */) => {
    if (!g.mainWindow && g.appIsReady) { // sometimes, the event will be triggered before the app is ready, and creating new windows will fail
        createWindow()
    }
})

ipc.on('focusMainWebContents', () => {
    g.mainWindow.webContents.focus()
})

ipc.on('showSecondaryMenu', (event, data) => {
    if (!g.secondaryMenu) {
        g.secondaryMenu = buildAppMenu({secondary: true})
    }
    g.secondaryMenu.popup({
        x: data.x,
        y: data.y
    })
})
