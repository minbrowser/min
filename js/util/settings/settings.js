var settings = {
  filePath: (process.type === 'renderer' ? window.globalArgs['user-data-path'] : userDataPath) + (process.platform === 'win32' ? '\\' : '/') + 'settings.json',
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
    } else if (process.type === 'browser' && mainWindow) {
      mainWindow.webContents.send('receiveSettingsData', settings.list)
    }
  },
  runChangeCallacks () {
    settings.onChangeCallbacks.forEach(function (listener) {
      if (listener.key) {
        listener.cb(settings.list[listener.key])
      } else {
        listener.cb()
      }
    })
  },
  get: function (key) {
    return settings.list[key]
  },
  listen: function (key, cb) {
    if (key && cb) {
      cb(settings.get(key))
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
    }

    ipc.on('receiveSettingsData', function (e, data) {
      settings.list = data
      settings.runChangeCallacks()
    })
  }
}

settings.initialize()
module.exports = settings
