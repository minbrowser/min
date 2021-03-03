var settings = {
  filePath: (process.type === 'renderer' ? window.globalArgs['user-data-path'] : userDataPath) + (process.platform === 'win32' ? '\\' : '/') + 'settings.json',
  fileWritePromise: null,
  list: {},
  onChangeCallbacks: [],
  save: function () {
    /*
    Writing to the settings file from multiple places simultaneously causes data corruption, so to avoid that:
    * We forward data from the renderer process to the main process, and only write from there
    * In the main process, we put multiple save requests in a queue (by chaining them to a promise) so they execute individually
    * https://github.com/minbrowser/min/issues/1520
    */

    if (process.type === 'renderer') {
      ipc.send('receiveSettingsData', settings.list)
    }

    if (process.type === 'browser') {
      /* eslint-disable no-inner-declarations */
      /* eslint-disable no-inner-declarations */
      function newFileWrite () {
        return fs.promises.writeFile(settings.filePath, JSON.stringify(settings.list)).then(function (e) {
          if (cb) {
            cb()
          }
        })
      }

      function ongoingFileWrite () {
        return settings.fileWritePromise || Promise.resolve()
      }
      /* eslint-enable no-inner-declarations */

      // eslint-disable-next-line no-return-assign
      settings.fileWritePromise = ongoingFileWrite().then(newFileWrite).then(() => settings.fileWritePromise = null)

      if (mainWindow) {
        mainWindow.webContents.send('receiveSettingsData', settings.list)
      }
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
      settings.onChangeCallbacks.push({ key, cb })
    } else if (key) {
      // global listener
      settings.onChangeCallbacks.push({ cb: key })
    }
  },
  set: function (key, value) {
    settings.list[key] = value
    settings.save()
    settings.runChangeCallacks()
  },
  initialize: function () {
    var fileData
    try {
      fileData = fs.readFileSync(settings.filePath, 'utf-8')
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.warn(e)
      }
    }
    if (fileData) {
      settings.list = JSON.parse(fileData)
    }

    ipc.on('receiveSettingsData', function (e, data) {
      settings.list = data
      settings.runChangeCallacks()

      if (process.type === 'browser') {
        settings.save()
      }
    })
  }
}

settings.initialize()
module.exports = settings
