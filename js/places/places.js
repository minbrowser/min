/* global Worker tabs */

var webviews = require('webviews.js')
const db = require('util/database.js').db
const searchEngine = require('util/searchEngine.js')
const urlParser = require('util/urlParser.js')

const places = {
  savePage: function (tabId, extractedText) {
    /* this prevents pages that are immediately left from being saved to history, and also gives the page-favicon-updated event time to fire (so the colors saved to history are correct). */
    setTimeout(function () {
      const tab = tabs.get(tabId)
      if (tab) {
        const data = {
          url: urlParser.getSourceURL(tab.url), // for PDF viewer and reader mode, save the original page URL and not the viewer URL
          title: tab.title,
          color: tab.backgroundColor,
          extractedText: extractedText
        }

        places.worker.postMessage({
          action: 'updatePlace',
          pageData: data,
          flags: {
            isNewVisit: true
          }
        })
      }
    }, 500)
  },
  receiveHistoryData: function (tabId, args) {
    // called when js/preload/textExtractor.js returns the page's text content

    var tab = tabs.get(tabId)
    var data = args[0]

    if (tab.url.startsWith('data:') || tab.url.length > 5000) {
      /*
      very large URLs cause performance issues. In particular:
      * they can cause the database to grow abnormally large, which increases memory usage and startup time
      * they can cause the browser to hang when they are displayed in search results
      To avoid this, don't save them to history
      */
      return
    }

    /* if the page is an internal page, it normally shouldn't be saved,
     unless the page represents another page (such as the PDF viewer or reader view) */
    var isNonIndexableInternalPage = urlParser.isInternalURL(tab.url) && urlParser.getSourceURL(tab.url) === tab.url
    var isSearchPage = searchEngine.isSearchURL(tab.url)

    // full-text data from search results isn't useful
    if (isSearchPage) {
      data.extractedText = ''
    }

    // don't save to history if in private mode, or the page is a browser page (unless it contains the content of a normal page)
    if (tab.private === false && !isNonIndexableInternalPage) {
      places.savePage(tabId, data.extractedText)
    }
  },
  callbacks: [],
  addWorkerCallback: function (callback) {
    const callbackId = (Date.now() / 1000) + Math.random()
    places.callbacks.push({id: callbackId, fn: callback})
    return callbackId
  },
  runWorkerCallback: function (id, data) {
    for (var i = 0; i < places.callbacks.length; i++) {
      if (places.callbacks[i].id === id) {
        places.callbacks[i].fn(data)
        places.callbacks.splice(i, 1)
      }
    }
  },
  deleteHistory: function (url) {
    places.worker.postMessage({
      action: 'deleteHistory',
      pageData: {
        url: url
      }
    })
  },
  deleteAllHistory: function () {
    places.worker.postMessage({
      action: 'deleteAllHistory'
    })
  },
  searchPlaces: function (text, callback, options) {
    const callbackId = places.addWorkerCallback(callback)
    places.worker.postMessage({
      action: 'searchPlaces',
      text: text,
      callbackId: callbackId,
      options: options
    })
  },
  searchPlacesFullText: function (text, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.worker.postMessage({
      action: 'searchPlacesFullText',
      text: text,
      callbackId: callbackId
    })
  },
  getPlaceSuggestions: function (url, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.worker.postMessage({
      action: 'getPlaceSuggestions',
      text: url,
      callbackId: callbackId
    })
  },
  onMessage: function (e) { // assumes this is from a search operation
    places.runWorkerCallback(e.data.callbackId, e.data.result)
  },
  updateItem: function (url, fields, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.worker.postMessage({
      action: 'updatePlace',
      pageData: {
        url: url,
        ...fields
      },
      callbackId: callbackId
    })
  },
  toggleBookmarked: function (tabId, callback) { // Toggles whether a URL is bookmarked or not
    const url = tabs.get(tabId).url

    db.places.where('url').equals(url).first(function (item) {
      if (item && item.isBookmarked) {
        places.updateItem(url, {isBookmarked: false}, function () {
          callback(false)
        })
      } else {
        // if this page is open in a private tab, the title may not be saved already, so it needs to be included here
        places.updateItem(url, {
          isBookmarked: true,
          title: tabs.get(tabId).title
        }, function () {
          callback(true)
        })
      }
    })
  },
  toggleTag: function (url, tag) {
    db.places.where('url').equals(url).first(function (item) {
      if (!item) {
        return
      }
      if (item.tags.includes(tag)) {
        item.tags = item.tags.filter(t => t !== tag)
      } else {
        item.tags.push(tag)
      }
      places.worker.postMessage({
        action: 'updatePlace',
        pageData: {
          url: url,
          tags: item.tags
        }
      })
    })
  },
  getSuggestedTags: function (url, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.worker.postMessage({
      action: 'getSuggestedTags',
      pageData: {
        url: url
      },
      callbackId: callbackId
    })
  },
  getSuggestedItemsForTags: function (tags, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.worker.postMessage({
      action: 'getSuggestedItemsForTags',
      pageData: {
        tags: tags
      },
      callbackId: callbackId
    })
  },
  autocompleteTags: function (tags, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.worker.postMessage({
      action: 'autocompleteTags',
      pageData: {
        tags: tags
      },
      callbackId: callbackId
    })
  },
  initialize: function () {
    if (places.worker) {
      places.worker.terminate()
    }
    places.worker = new Worker('js/places/placesWorker.js')
    places.worker.onmessage = places.onMessage

    webviews.bindIPC('pageData', places.receiveHistoryData)
  }
}

places.initialize()
module.exports = places
