import { BrowserView, session, ipcMain } from 'electron'

import g from './global'
import createPrompt from './prompt'

const viewMap = {} // id: view
const viewStateMap = {} // id: view state

const l = s => s  // just a temporary stub for the i18n method

const createView = (id, webPreferencesString, boundsString, events) => {
    const view = new BrowserView(JSON.parse(webPreferencesString))

    events.forEach((ev) => {
        view.webContents.on(ev.event, (e, ...restArgs) => {
            if (ev.options && ev.options.preventDefault) {
                e.preventDefault()
            }
            g.mainWindow.webContents.send('view-event', {
                viewId: id,
                eventId: ev.id,
                args: restArgs
            })
        })
    })

    view.webContents.on('ipc-message', (e, channel, data) => {
        g.mainWindow.webContents.send('view-ipc', {
            id: id,
            name: channel,
            data: data,
            frameId: e.frameId
        })
    })

    // Open a login prompt when site asks for http authentication
    view.webContents.on('login', (event, authenticationResponseDetails, authInfo, callback) => {
        if (authInfo.scheme !== 'basic') { // Only for basic auth
            return
        }

        event.preventDefault()

        const title = l('loginPromptTitle').replace('%h', authInfo.host).replace('%r', authInfo.realm)

        createPrompt({
            text: title,
            values: [
                { placeholder: l('username'), id: 'username', type: 'text' },
                { placeholder: l('password'), id: 'password', type: 'password' }
            ],
            ok: l('dialogConfirmButton'),
            cancel: l('dialogSkipButton'),
            width: 400,
            height: 200
        }, (result) => {
            // resend request with auth credentials
            callback(result.username, result.password)
        })
    })

    view.setBounds(JSON.parse(boundsString))

    viewMap[id] = view
    viewStateMap[id] = {loadedInitialURL: false}

    return view
}

const destroyView = (id) => {
    // destroy an associated partition
    const partition = viewMap[id].webContents.getWebPreferences().partition

    if (partition) {
        session.fromPartition(partition).destroy()
    }

    if (viewMap[id] === g.mainWindow.getBrowserView()) {
        g.mainWindow.setBrowserView(null)
    }

    viewMap[id].destroy()

    delete viewMap[id]
    delete viewStateMap[id]
}

const destroyAllViews = () => {
    for (const id in viewMap) {
        destroyView(id)
    }
}

const setView = (id) => {
    g.mainWindow.setBrowserView(viewMap[id])
}

const setBounds = (id, bounds) => {
    viewMap[id].setBounds(bounds)
}

const focusView = (id) => {
    // empty views can't be focused because they won't propogate keyboard events correctly, see https://github.com/minbrowser/min/issues/616
    // also, make sure the view exists, since it might not if the app is shutting down
    if (viewMap[id] && (viewMap[id].webContents.getURL() !== '' || viewMap[id].webContents.isLoading())) {
        viewMap[id].webContents.focus()
    } else if (g.mainWindow) {
        g.mainWindow.webContents.focus()
    }
}

const hideCurrentView = () => {
    g.mainWindow.setBrowserView(null)
    g.mainWindow.webContents.focus()
}

const getView = (id) => {
    return viewMap[id]
}

const getViewIDFromWebContents = (contents) => {
    for (const id in viewMap) {
        if (viewMap[id].webContents === contents) {
            return id
        }
    }
}

ipcMain.on('createView', (e, args) => {
    createView(args.id, args.webPreferencesString, args.boundsString, args.events)
})

ipcMain.on('destroyView', (e, id) => {
    destroyView(id)
})

ipcMain.on('destroyAllViews', () => {
    destroyAllViews()
})

ipcMain.on('setView', (e, args) => {
    setView(args.id)
    setBounds(args.id, args.bounds)
    if (args.focus) {
        focusView(args.id)
    }
})

ipcMain.on('setBounds', (e, args) => {
    setBounds(args.id, args.bounds)
})

ipcMain.on('focusView', (e, id) => {
    focusView(id)
})

ipcMain.on('hideCurrentView', (e) => {
    hideCurrentView()
})

ipcMain.on('loadURLInView', (e, args) => {
    const { id, url } = args

    // wait until the first URL is loaded to set the background color so that new tabs can use a custom background
    if (!viewStateMap[id].loadedInitialURL) {
        viewMap[id].setBackgroundColor('#fff')
    }
    viewMap[id].webContents.loadURL(url)
    viewStateMap[id].loadedInitialURL = true
})

ipcMain.on('callViewMethod', (e, data) => {
    let error
    let result

    try {
        const webContents = viewMap[data.id].webContents
        result = webContents[data.method].apply(webContents, data.args)
    } catch (e) {
        error = e
    }
    if (result instanceof Promise) {
        result.then((result) => {
            if (data.callId) {
                g.mainWindow.webContents.send('async-call-result', {callId: data.callId, error: null, result})
            }
        })
        result.catch((error) => {
            if (data.callId) {
                g.mainWindow.webContents.send('async-call-result', {callId: data.callId, error, result: null})
            }
        })
    } else if (data.callId) {
        g.mainWindow.webContents.send('async-call-result', {callId: data.callId, error, result})
    }
})

ipcMain.on('getCapture', (e, data) => {
    viewMap[data.id].webContents.capturePage().then((img) => {
        const size = img.getSize()

        if (size.width === 0 && size.height === 0) {
            return
        }

        img = img.resize({width: data.width, height: data.height})
        g.mainWindow.webContents.send('captureData', {id: data.id, url: img.toDataURL()})
    })
})

global.getView = getView

export {
    getViewIDFromWebContents,
    destroyAllViews
}
