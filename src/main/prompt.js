/* Simple input prompt. */
import { BrowserWindow, ipcMain } from 'electron'
import path from 'path'

import g from './global'
import settings from './settings'

let promptAnswer
let promptOptions

const createPrompt = (options, callback) => {
    promptOptions = options

    const { parent, width = 360, height = 140 } = options

    let promptWindow = new BrowserWindow({
        width: width,
        height: height,
        parent: parent != null ? parent : g.mainWindow,
        show: false,
        modal: true,
        alwaysOnTop: true,
        title: options.title,
        autoHideMenuBar: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            sandbox: false
        }
    })

    promptWindow.on('closed', () => {
        promptWindow = null
        callback(promptAnswer)
    })

    // Load the HTML dialog box
    promptWindow.loadURL(path.join('file://', __dirname) + '/pages/prompt/index.html')
    promptWindow.once('ready-to-show', () => { promptWindow.show() })
}

ipcMain.on('show-prompt', (options, callback) => {
    createPrompt(options, callback)
})

ipcMain.on('open-prompt', (event) => {
    event.returnValue = JSON.stringify({
        label: promptOptions.text,
        ok: promptOptions.ok,
        values: promptOptions.values,
        cancel: promptOptions.cancel,
        darkMode: settings.get('darkMode')
    })
})

ipcMain.on('close-prompt', (event, data) => {
    promptAnswer = data
})

ipcMain.on('prompt', (event, data) => {
    createPrompt(data, (result) => {
        event.returnValue = result
    })
})

export default createPrompt
