if (process.type === 'renderer') {
  var db = require('util/database.js')
}

var settings = {
  filePath: userDataPath + (process.platform === 'win32' ? '\\' : '/') + 'settings.json',
  list: {},
  onChangeCallbacks: [],
  save: function (cb) {
    fs.writeFile(settings.filePath, JSON.stringify(settings.list), function (e) {
      if (cb) {
        cb()
      }
    })
    if (process.type === 'renderer') {
      ipc.send('receiveSettingsData', settings.list)
    } else if (process.type === 'browser') {
      mainWindow.webContents.send('receiveSettingsData', settings.list)
    }
  },
  runChangeCallacks() {
    settings.onChangeCallbacks.forEach(function (listener) {
      if (listener.key) {
        listener.cb(settings.list[listener.key])
      } else {
        listener.cb()
      }
    })
  },
  get: function (key, cb) {
    cb(settings.list[key])
  },
  listen: function (key, cb) {
    if (key && cb) {
      settings.get(key, cb)
      settings.onChangeCallbacks.push({key, cb})
    } else if (key) {
      // global listener
      settings.onChangeCallbacks.push({cb: key})
    }
  },
  set: function (key, value, cb) {
    settings.list[key] = value
    settings.save(cb)
    settings.runChangeCallacks()
  },
  initialize: function () {
    var fileData
    try {
      fileData = fs.readFileSync(settings.filePath, 'utf-8')
    } catch (e) {
      console.warn(e)
    }
    if (fileData) {
      settings.list = JSON.parse(fileData)
    } else if (process.type === 'renderer') {
      // import from indexeddb
      db.settings.each(function (setting) {
        settings.set(setting.key, setting.value)
      })
    }

    ipc.on('receiveSettingsData', function (e, data) {
      settings.list = data
      settings.runChangeCallacks()
    })
  }
}

if (require.main === module) {
  settings.initialize()
} else {
  module.exports = settings
}
