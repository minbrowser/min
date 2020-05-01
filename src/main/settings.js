import fs from 'fs'
import { ipcMain, app } from 'electron'
import g from './global'

const userDataPath = app.getPath('userData')

class Settings {
    constructor () {
        this.filePath = userDataPath + (process.platform === 'win32' ? '\\' : '/') + 'settings.json'
        this.list = {}
        this.onChangeCallbacks = []

        this.initialize()
    }

    save (cb) {
        fs.writeFile(this.filePath, JSON.stringify(this.list), () => {
            if (cb) {
                cb()
            }
        })

        if (g.mainWindow) {
            g.mainWindow.webContents.send('receiveSettingsData', this.list)
        }
    }

    runChangeCallbacks () {
        this.onChangeCallbacks.forEach((listener) => {
            if (listener.key) {
                listener.cb(this.list[listener.key])
            } else {
                listener.cb()
            }
        })
    }

    get (key) {
        return this.list[key]
    }

    listen (key, cb) {
        if (key && cb) {
            cb(this.get(key))
            this.onChangeCallbacks.push({ key, cb })
        } else if (key) {
            // global listener
            this.onChangeCallbacks.push({ cb: key })
        }
    }

    set (key, value, cb) {
        this.list[key] = value
        this.save(cb)
        this.runChangeCallbacks()
    }

    initialize () {
        let fileData

        try {
            fileData = fs.readFileSync(this.filePath, 'utf-8')
        } catch (e) {
            console.warn(e)
        }

        if (fileData) {
            this.list = JSON.parse(fileData)
        }

        ipcMain.on('receiveSettingsData', (e, data) => {
            this.list = data
            this.runChangeCallbacks()
        })
    }
}

export default new Settings()
