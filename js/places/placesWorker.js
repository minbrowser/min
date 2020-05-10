/* global importScripts db performance searchPlaces postMessage fullTextPlacesSearch */

console.log('worker started ', performance.now())

importScripts('../../node_modules/dexie/dist/dexie.min.js')
importScripts('../../node_modules/string_score/string_score.min.js')
importScripts('../util/database.js')
importScripts('fullTextSearch.js')
importScripts('placesSearch.js')
importScripts('tagIndex.js')

const spacesRegex = /[\+\s._/-]+/g // things that could be considered spaces

function calculateHistoryScore (item) { // item.boost - how much the score should be multiplied by. Example - 0.05
  let fs = item.lastVisit * (1 + 0.036 * Math.sqrt(item.visitCount))

  // bonus for short url's
  if (item.url.length < 20) {
    fs += (30 - item.url.length) * 2500
  }

  if (item.boost) {
    fs += fs * item.boost
  }

  return fs
}

let oneDayInMS = 24 * 60 * 60 * 1000 // one day in milliseconds
let oneWeekAgo = Date.now() - (oneDayInMS * 7)

// the oldest an item can be to remain in the database
let maxItemAge = oneDayInMS * 42

function cleanupHistoryDatabase () { // removes old history entries
  db.places.where('lastVisit').below(Date.now() - maxItemAge).and(function (item) {
    return item.isBookmarked === false
  }).delete()
}

setTimeout(cleanupHistoryDatabase, 20000) // don't run immediately on startup, since is might slow down searchbar search.
setInterval(cleanupHistoryDatabase, 60 * 60 * 1000)

// cache history in memory for faster searching. This actually takes up very little space, so we can cache everything.

let historyInMemoryCache = []

function addToHistoryCache (item) {
  if (item.isBookmarked) {
    tagIndex.addPage(item)
  }
  delete item.pageHTML
  delete item.extractedText
  delete item.searchIndex

  historyInMemoryCache.push(item)
}

function addOrUpdateHistoryCache (item) {
  delete item.pageHTML
  delete item.extractedText
  delete item.searchIndex

  let oldItem

  for (let i = 0; i < historyInMemoryCache.length; i++) {
    if (historyInMemoryCache[i].url === item.url) {
      oldItem = historyInMemoryCache[i]
      historyInMemoryCache[i] = item
      break
    }
  }

  if (!oldItem) {
    historyInMemoryCache.push(item)
  }

  if (oldItem) {
    tagIndex.onChange(oldItem, item)
  }
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
  })
}

loadHistoryInMemory()

onmessage = function (e) {
  const action = e.data.action
  const pageData = e.data.pageData
  const flags = e.data.flags || {}
  const searchText = e.data.text && e.data.text.toLowerCase()
  const callbackId = e.data.callbackId
  const options = e.data.options

  if (action === 'updatePlace') {
    db.transaction('rw', db.places, function () {
      db.places.where('url').equals(pageData.url).first(function (item) {
        var isNewItem = false
        if (!item) {
          isNewItem = true
          item = {
            url: pageData.url,
            title: pageData.url,
            color: null,
            visitCount: 0,
            lastVisit: Date.now(),
            pageHTML: '',
            extractedText: '',
            searchIndex: [],
            isBookmarked: false,
            tags: [],
            metadata: {}
          }
        }
        for (let key in pageData) {
          if (key === 'extractedText') {
            item.searchIndex = tokenize(pageData.extractedText)
          } else {
            item[key] = pageData[key]
          }
        }

        if (flags.isNewVisit) {
          item.visitCount++
          item.lastVisit = Date.now()
        }

        db.places.put(item)
        if (isNewItem) {
          addToHistoryCache(item)
        } else {
          addOrUpdateHistoryCache(item)
        }
        postMessage({
          result: null,
          callbackId: callbackId
        })
      }).catch(function (err) {
        console.warn('failed to update history.')
        console.warn('page url was: ' + pageData.url)
        console.error(err)
      })
    })
  }

  if (action === 'deleteHistory') {
    db.places.where('url').equals(pageData.url).delete()

    // delete from the in-memory cache
    for (let i = 0; i < historyInMemoryCache.length; i++) {
      if (historyInMemoryCache[i].url === pageData.url) {
        historyInMemoryCache.splice(i, 1)
      }
    }
  }

  if (action === 'deleteAllHistory') {
    db.places.filter(function (item) {
      return item.isBookmarked === false
    }).delete().then(function () {
      loadHistoryInMemory()
    })
  }

  if (action === 'getSuggestedTags') {
    postMessage({
      result: tagIndex.getSuggestedTags(historyInMemoryCache.find(i => i.url === pageData.url)),
      callbackId: callbackId
    })
  }

  if (action === 'getSuggestedItemsForTags') {
    postMessage({
      result: tagIndex.getSuggestedItemsForTags(pageData.tags),
      callbackId: callbackId
    })
  }

  if (action === 'autocompleteTags') {
    postMessage({
      result: tagIndex.autocompleteTags(pageData.tags),
      callbackId: callbackId
    })
  }

  if (action === 'searchPlaces') { // do a history search
    searchPlaces(searchText, function (matches) {
      postMessage({
        result: matches,
        callbackId: callbackId
      })
    }, options)
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

    let baseItem = null

    for (let i = 0; i < historyInMemoryCache.length; i++) {
      if (historyInMemoryCache[i].url === searchText) {
        baseItem = historyInMemoryCache[i]
        break
      }
    }

    // use a default item. This could occur if the given url is for a page that has never finished loading
    if (!baseItem) {
      baseItem = {
        url: '',
        title: '',
        lastVisit: Date.now(),
        visitCount: 1
      }
    }

    const cTime = Date.now()

    let results = historyInMemoryCache.slice().filter(i => cTime - i.lastVisit < 604800000)

    for (let i = 0; i < results.length; i++) {
      results[i].hScore = calculateHistoryScore(results[i])
    }

    results = results.sort(function (a, b) {
      return b.hScore - a.hScore
    })

    postMessage({
      result: results.slice(0, 100),
      callbackId: callbackId
    })
  }
}
