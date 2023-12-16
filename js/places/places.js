/* global tabs */

var webviews = require('webviews.js')
const searchEngine = require('util/searchEngine.js')
const urlParser = require('util/urlParser.js')

const places = {
  messagePort: null,
  sendMessage: function (data) {
    places.messagePort.postMessage(data)
  },
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

        places.sendMessage({
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
    var isSearchPage = !!(searchEngine.getSearch(tab.url))

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
    places.callbacks.push({ id: callbackId, fn: callback })
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
    places.sendMessage({
      action: 'deleteHistory',
      pageData: {
        url: url
      }
    })
  },
  deleteAllHistory: function () {
    places.sendMessage({
      action: 'deleteAllHistory'
    })
  },
  searchPlaces: function (text, callback, options) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'searchPlaces',
      text: text,
      callbackId: callbackId,
      options: options
    })
  },
  searchPlacesFullText: function (text, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'searchPlacesFullText',
      text: text,
      callbackId: callbackId
    })
  },
  getPlaceSuggestions: function (url, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'getPlaceSuggestions',
      text: url,
      callbackId: callbackId
    })
  },
  onMessage: function (e) {
    places.runWorkerCallback(e.data.callbackId, e.data.result)
  },
  getItem: function (url, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'getPlace',
      pageData: {
        url: url
      },
      callbackId: callbackId
    })
  },
  getAllItems: function (callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'getAllPlaces',
      callbackId: callbackId
    })
  },
  updateItem: function (url, fields, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'updatePlace',
      pageData: {
        url: url,
        ...fields
      },
      callbackId: callbackId
    })
  },
  toggleTag: function (url, tag) {
    places.getItem(url, function (item) {
      if (!item) {
        return
      }
      if (item.tags.includes(tag)) {
        item.tags = item.tags.filter(t => t !== tag)
      } else {
        item.tags.push(tag)
      }
      places.sendMessage({
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
    places.sendMessage({
      action: 'getSuggestedTags',
      pageData: {
        url: url
      },
      callbackId: callbackId
    })
  },
  getAllTagsRanked: function (url, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'getAllTagsRanked',
      pageData: {
        url: url
      },
      callbackId: callbackId
    })
  },
  getSuggestedItemsForTags: function (tags, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'getSuggestedItemsForTags',
      pageData: {
        tags: tags
      },
      callbackId: callbackId
    })
  },
  autocompleteTags: function (tags, callback) {
    const callbackId = places.addWorkerCallback(callback)
    places.sendMessage({
      action: 'autocompleteTags',
      pageData: {
        tags: tags
      },
      callbackId: callbackId
    })
  },
  initialize: function () {
    const { port1, port2 } = new MessageChannel()

    ipc.postMessage('places-connect', null, [port1])
    places.messagePort = port2
    port2.addEventListener('message', places.onMessage)
    port2.start()

    webviews.bindIPC('pageData', places.receiveHistoryData)
  }
}

places.initialize()
module.exports = places
