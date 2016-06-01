/*
gets and sets settings
requires Dexie and util/database.js
*/

var settings = {
  loaded: false,
  list: {},
  onLoadCallbacks: [],
  get: function (key, cb, options) {
    var isCacheable = !options || options.fromCache !== false

    // get the setting from the cache if possible
    if (settings.loaded && isCacheable) {
      cb(settings.list[key])

    // if the settings haven't loaded, wait until they have
    } else if (isCacheable) {
      settings.onLoadCallbacks.push({
        key: key,
        cb: cb
      })

    // the setting can't be cached, get it from the database
    } else {
      db.settings.where('key').equals(key).first(function (item) {
        if (item) {
          cb(item.value)
        } else {
          cb(null)
        }
      })
    }
  },
  set: function (key, value, cb) {
    db.settings.put({
      key: key,
      value: value
    }).then(function () {
      settings.list[key] = value
      if (cb) {
        cb()
      }
    })
  },
  delete: function (key, cb) {
    db.settings.where('key').equals(key).delete()
      .then(function () {
        delete settings.list[key]
        if (cb) {
          cb()
        }
      })
  },
  load: function () {
    db.settings.each(function (setting) {
      settings.list[setting.key] = setting.value
    }).then(function () {
      settings.loaded = true

      settings.onLoadCallbacks.forEach(function (item) {
        item.cb(settings.list[item.key])
      })

      settings.onLoadCallbacks = []
    })
  },
  onLoad: function (cb) {
    if (settings.loaded) {
      cb()
    } else {
      settings.onLoadCallbacks.push({
        key: '',
        cb: cb
      })
    }
  }
}

settings.load()
