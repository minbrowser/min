const fs = require('fs')
const {db, dbLegacy} = require('util/database.js')
const places = require('js/places/places.js')

var dbPath = userDataPath + (platformType === 'windows' ? '\\IndexedDB\\file__0.indexeddb.leveldb' : '/IndexedDB/file__0.indexeddb.leveldb')
var savePath = userDataPath + (platformType === 'windows' ? '\\database-migration' : '/database-migration')

dbLegacy.places.count().then(function (oldCount) {
  if (oldCount > 0) {
      // the legacy DB exists

    var historyItems = []
    var readingListItems = []

    dbLegacy.places.each(function (item) {
      historyItems.push(item)
    }).then(function () {
      dbLegacy.readingList.each(function (item) {
        readingListItems.push(item)
      }).then(function () {
        fs.writeFileSync(savePath, JSON.stringify({history: historyItems, readingList: readingListItems}))
        remote.app.relaunch({
          args: remote.getGlobal('process').argv.slice(1).concat(['--rename-db-and-relaunch'])
        })
        remote.app.quit()
      })
    })
  }
})

fs.readFile(savePath, function (err, data) {
  if (err || !data) {
    console.warn(err)
    return
  }

  var items = JSON.parse(data)
  var historyItems = items.history
  var readingListItems = items.readingList
  console.log(items)

  function migrateHistoryItem () {
    if (historyItems.length === 0) {
    // restart the worker to fix autocomplete
      places.initialize()
    // completed history migration, move on to reading list
      migrateReadingListItem()
      return
    }
    var item = historyItems.shift()
    item.tags = []
    db.places.where('url').equals(item.url).count().then(function (count) {
      if (count === 0) {
        db.places.put(item).then(function () {
          console.info('put item', item.url)
          setTimeout(migrateHistoryItem, 100)
        })
      } else {
        console.info('skipping item', item.url)
        setTimeout(migrateHistoryItem, 100)
      }
    })
  }
  migrateHistoryItem()

  function migrateReadingListItem () {
    if (readingListItems.length === 0) {
        // completed migration
      fs.rename(savePath, savePath + '.recovery', function () {})
      return
    }

    var item = readingListItems.shift()
    db.readingList.where('url').equals(item.url).count().then(function (count) {
      if (count === 0) {
        db.readingList.put(item).then(function () {
          console.info('put reading list item', item.url)
          setTimeout(migrateReadingListItem, 100)
        })
      } else {
        console.info('skipping item', item.url)
        setTimeout(migrateReadingListItem, 100)
      }
    })
  }
})
