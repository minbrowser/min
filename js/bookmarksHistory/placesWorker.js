console.log('worker started ', performance.now())

importScripts('../../node_modules/dexie/dist/dexie.min.js')
importScripts('../../node_modules/string_score/string_score.min.js')
importScripts('../util/database.js')
importScripts('fullTextSearch.js')
importScripts('placesSearch.js')

var spacesRegex = /[\+\s._/-]/g // things that could be considered spaces
var wordRegex = /^[a-z\s]+$/g

function calculateHistoryScore (item, boost) { // boost - how much the score should be multiplied by. Example - 0.05
  var fs = item.lastVisit * (1 + 0.036 * Math.sqrt(item.visitCount))

  // bonus for short url's
  if (item.url.length < 20) {
    fs += (30 - item.url.length) * 2500
  }

  if (item.boost) {
    fs += fs * item.boost
  }

  return fs
}

var oneDayInMS = 24 * 60 * 60 * 1000 // one day in milliseconds

var oneWeekAgo = Date.now() - (oneDayInMS * 7)

// the oldest an item can be to remain in the database
var minItemAge = Date.now() - (oneDayInMS * 42)

function cleanupHistoryDatabase () { // removes old history entries
  db.places.where('lastVisit').below(minItemAge).and(function (item) {
    return item.isBookmarked === false
  }).delete()
}

setTimeout(cleanupHistoryDatabase, 20000) // don't run immediately on startup, since is might slow down searchbar search.
setInterval(cleanupHistoryDatabase, 60 * 60 * 1000)

// cache history in memory for faster searching. This actually takes up very little space, so we can cache everything.

var historyInMemoryCache = []
var doneLoadingHistoryCache = false

function addToHistoryCache (item) {
  delete item.pageHTML
  delete item.extractedText
  delete item.searchIndex

  historyInMemoryCache.push(item)
}

function loadHistoryInMemory () {
  historyInMemoryCache = []

  db.places.orderBy('visitCount').reverse().each(function (item) {
    addToHistoryCache(item)
  }).then(function () {
    // if we have enough matches during the search, we exit. In order for this to work, frequently visited sites have to come first in the cache.
    historyInMemoryCache.sort(function (a, b) {
      return calculateHistoryScore(b) - calculateHistoryScore(a)
    })

    doneLoadingHistoryCache = true
  })
}

loadHistoryInMemory()

setInterval(loadHistoryInMemory, 30 * 60 * 1000)

// calculates how similar two history items are

function calculateHistorySimilarity (a, b) {
  var score = 0

  if (a.url.split('/')[2] === b.url.split('/')[2]) {
    score += 0.1
  }

  var aWords = a.title.toLowerCase().split(spacesRegex)
  var bText = b.title.toLowerCase()
  var wm = 0
  for (var i = 0; i < aWords.length; i++) {
    if (aWords[i].length > 2 && aWords[i] !== 'http' && aWords[i] !== 'https' && bText.indexOf(aWords[i]) !== -1) {
      score += 0.0025 * aWords[i].length
      wm++
    }
  }

  if (wm > 1) {
    score += (0.05 * Math.pow(1.5, wm))
  }

  var vDiff = Math.abs(a.lastVisit - b.lastVisit)
  if (vDiff < 600000 && b.visitCount > 10) {
    score += 0.1 + (0.02 * Math.sqrt(a.visitCount)) + ((600000 - vDiff) * 0.0000025)
  }

  var diffPct = vDiff / a.visitCount

  if (diffPct > 0.9 && diffPct < 1.1) {
    score += 0.15
  }

  return score
}

onmessage = function (e) {
  var action = e.data.action
  var pageData = e.data.pageData
  var searchText = e.data.text && e.data.text.toLowerCase()
  var callbackId = e.data.callbackId

  if (action === 'updateHistory') {
    var item = {
      url: pageData.url,
      title: pageData.title || pageData.url,
      color: pageData.color,
      /* visitCount is added below */
      lastVisit: Date.now(),
      pageHTML: '',
      extractedText: pageData.extractedText || '',
      // searchIndex is updated by DB hooks whenever extractedText changes
      searchIndex: [],
      metadata: pageData.metadata
    }

    db.transaction('rw', db.places, function () {
      db.places.where('url').equals(pageData.url).first(function (oldItem) {
        // a previous item exists, update it
        if (oldItem) {
          item.visitCount = oldItem.visitCount + 1
          item.isBookmarked = oldItem.isBookmarked
          db.places.where('url').equals(pageData.url).modify(item)
        /* if the item doesn't exist, add a new item */
        } else {
          item.visitCount = 1
          item.isBookmarked = false
          db.places.add(item)

          addToHistoryCache(item)
        }
      }).catch(function (err) {
        console.warn('failed to update history.')
        console.warn('page url was: ' + pageData.url)
        console.error(err)
      })
    })
  }

  if (action === 'deleteHistory') {
    db.places.where('url').equals(pageData.url).filter(function (item) {
      return item.isBookmarked === false
    }).delete()

    // delete from the in-memory cache
    for (var i = 0; i < historyInMemoryCache.length; i++) {
      if (historyInMemoryCache[i].url === pageData.url) {
        historyInMemoryCache.splice(i, 1)
      }
    }
  }

  if (action === 'searchPlaces') { // do a history search
    searchPlaces(searchText, function (matches) {
      postMessage({
        result: matches,
        callbackId: callbackId
      })
    })
  }

  if (action === 'searchPlacesFullText') {
    fullTextPlacesSearch(searchText, function (matches) {
      matches.sort(function (a, b) {
        return calculateHistoryScore(b) - calculateHistoryScore(a)
      })

      postMessage({
        result: matches.slice(0, 100),
        callbackId: callbackId
      })
    })
  }

  if (action === 'getPlaceSuggestions') {
    // get the history item for the provided url

    var baseItem = null

    for (var i = 0; i < historyInMemoryCache.length; i++) {
      if (historyInMemoryCache[i].url === searchText) {
        baseItem = historyInMemoryCache[i]
        break
      }
    }

    // use a default item. This could occur if the given url is for a page that has never finished loading
    if (!baseItem) {
      baseItem = {
        url: searchText,
        title: '',
        lastVisit: Date.now(),
        visitCount: 1
      }
    }

    var results = historyInMemoryCache.slice()

    var cTime = Date.now()

    for (var i = 0; i < results.length; i++) {
      if (cTime - results[i].lastVisit > 604800000) {
        results[i].boost = 0
      } else {
        results[i].boost = calculateHistorySimilarity(baseItem, results[i]) * 1.2

        if (cTime - results[i].lastVisit < 60000) {
          results[i].boost -= 0.1
        }
      }

      results[i].hScore = calculateHistoryScore(results[i])
    }

    var results = results.sort(function (a, b) {
      return b.hScore - a.hScore
    })

    postMessage({
      result: results.slice(0, 100),
      callbackId: callbackId
    })
  }
}
