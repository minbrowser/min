import path from 'path'
import fs from 'fs'
import { BrowserWindow, app, screen } from 'electron'

import { clamp, isWindows, isDarwin } from './utils'
import g from './global'
import settings from './settings'
import { destroyAllViews } from './viewManager'

const userDataPath = app.getPath('userData')
const browserPage = path.join('file://', __dirname, '/index.html') // 'file://' + __dirname + '/index.html'

const saveWindowBounds = () => {
    if (g.mainWindow) {
        const bounds = Object.assign(g.mainWindow.getBounds(), {
            maximized: g.mainWindow.isMaximized()
        })

        fs.writeFileSync(path.join(userDataPath, 'windowBounds.json'), JSON.stringify(bounds))
    }
}

export const sendIPCToWindow = (window, action, data) => {
    // if there are no windows, create a new one
    if (!g.mainWindow) {
        createWindow(() => {
            g.mainWindow.webContents.send(action, data || {})
        })
    } else {
        g.mainWindow.webContents.send(action, data || {})
    }
}

export const openTabInWindow = (url) => {
    sendIPCToWindow(g.mainWindow, 'addTab', {
        url: url
    })
}

export const createWindow = (cb) => {
    fs.readFile(path.join(userDataPath, 'windowBounds.json'), 'utf-8', (e, data) => {
        let bounds

        if (data) {
            try {
                bounds = JSON.parse(data)
            } catch (e) {
                console.warn('error parsing window bounds file: ', e)
            }
        }

        if (e || !data || !bounds) { // there was an error, probably because the file doesn't exist
            const size = screen.getPrimaryDisplay().workAreaSize

            bounds = {
                x: 0,
                y: 0,
                width: size.width,
                height: size.height,
                maximized: true
            }
        }

        // make the bounds fit inside a currently-active screen
        // (since the screen Min was previously open on could have been removed)
        // see: https://github.com/minbrowser/min/issues/904
        const containingRect = screen.getDisplayMatching(bounds).workArea

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

const createWindowWithBounds = (bounds) => {
    g.mainWindow = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        minWidth: isWindows ? 400 : 320, // controls take up more horizontal space on Windows
        minHeight: 350,
        titleBarStyle: 'hiddenInset',
        icon: path.join(__dirname, '/icons/icon256.png'),
        frame: isDarwin || settings.get('useSeparateTitlebar') === true,
        alwaysOnTop: settings.get('windowAlwaysOnTop'),
        backgroundColor: '#fff', // the value of this is ignored, but setting it seems to work around https://github.com/electron/electron/issues/10559
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true, // used by ProcessSpawner
            additionalArguments: ['--user-data-path=' + userDataPath]
        }
    })

    // and load the index.html of the app.
    g.mainWindow.loadURL(browserPage)

    if (bounds.maximized) {
        g.mainWindow.maximize()

        g.mainWindow.webContents.on('did-finish-load', () => {
            sendIPCToWindow(g.mainWindow, 'maximize')
        })
    }

    g.mainWindow.on('close', () => {
        destroyAllViews()
        // save the window size for the next launch of the app
        saveWindowBounds()
    })

    // Emitted when the window is closed.
    g.mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
        g.mainWindow = null
    })

    g.mainWindow.on('focus', () => {
        sendIPCToWindow(g.mainWindow, 'windowFocus')
    })

    g.mainWindow.on('minimize', () => {
        sendIPCToWindow(g.mainWindow, 'minimize')
    })

    g.mainWindow.on('maximize', () => {
        sendIPCToWindow(g.mainWindow, 'maximize')
    })

    g.mainWindow.on('unmaximize', () => {
        sendIPCToWindow(g.mainWindow, 'unmaximize')
    })

    g.mainWindow.on('enter-full-screen', () => {
        sendIPCToWindow(g.mainWindow, 'enter-full-screen')
    })

    g.mainWindow.on('leave-full-screen', () => {
        sendIPCToWindow(g.mainWindow, 'leave-full-screen')
    })

    g.mainWindow.on('enter-html-full-screen', () => {
        sendIPCToWindow(g.mainWindow, 'enter-html-full-screen')
    })

    g.mainWindow.on('leave-html-full-screen', () => {
        sendIPCToWindow(g.mainWindow, 'leave-html-full-screen')
    })

    g.mainWindow.on('app-command', (e, command) => {
        if (command === 'browser-backward') {
            sendIPCToWindow(g.mainWindow, 'goBack')
        } else if (command === 'browser-forward') {
            sendIPCToWindow(g.mainWindow, 'goForward')
        }
    })

    // prevent remote pages from being loaded using drag-and-drop, since they would have node access
    g.mainWindow.webContents.on('will-navigate', (e, url) => {
        if (url !== browserPage) {
            e.preventDefault()
        }
    })

    return g.mainWindow
}
