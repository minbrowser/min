const fs = require('fs')
const {db, dbLegacy} = require('util/database.js')
const places = require('js/places/places.js')

var dbPath = window.globalArgs['user-data-path'] + (platformType === 'windows' ? '\\IndexedDB\\file__0.indexeddb.leveldb' : '/IndexedDB/file__0.indexeddb.leveldb')
var savePath = window.globalArgs['user-data-path'] + (platformType === 'windows' ? '\\database-migration' : '/database-migration')

dbLegacy.places.count().then(function (oldCount) {
  if (oldCount > 0) {
      // the legacy DB exists

    var historyItems = []
    var readingListItems = []

    Promise.all([
      dbLegacy.places.each(function (item) {
        historyItems.push(item)
      }),
      dbLegacy.readingList.each(function (item) {
        readingListItems.push(item)
      }),
      // it's possible for both the new DB and the old DB to contain items if you downgrade to an old version,
      // then upgrade again. In that case, we should attempt to merge both databases.
      db.places.each(function (item) {
        historyItems.push(item)
      }),
      db.readingList.each(function (item) {
        readingListItems.push(item)
      })
    ]).then(function () {
      fs.writeFileSync(savePath, JSON.stringify({history: historyItems, readingList: readingListItems}))
      remote.app.relaunch({
        args: remote.getGlobal('process').argv.slice(1).concat(['--rename-db']),
        // needed for Arch compatibility, see https://github.com/minbrowser/min/issues/854
        execPath: remote.getGlobal('process').argv[0]
      })
      remote.app.quit()
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
  console.log(JSON.parse(JSON.stringify(items)))

  function migrateHistoryItem () {
    if (historyItems.length === 0) {
    // restart the worker to fix autocomplete
      places.initialize()
    // completed history migration, move on to reading list
      migrateReadingListItem()
      return
    }
    var item = historyItems.shift()
    if (!item.tags) {
      item.tags = []
    }
    // the item could have an ID already if it's being merged from an existing new database, but we can't reuse it because it will overlap with the new items being created
    delete item.id
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
      fs.rename(savePath, savePath + '-' + Date.now() + '.recovery', function () {})
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
