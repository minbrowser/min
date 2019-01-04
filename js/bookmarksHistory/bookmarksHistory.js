/* global db Worker tabs */

const bookmarks = {
  updateHistory: function (tabId, extractedText, metadata) {
    /* this prevents pages that are immediately left from being saved to history, and also gives the page-favicon-updated event time to fire (so the colors saved to history are correct). */
    setTimeout(function () {
      const tab = tabs.get(tabId)
      if (tab) {
        const data = {
          url: tab.url,
          title: tab.title,
          color: tab.backgroundColor,
          extractedText: extractedText,
          metadata: metadata
        }

        bookmarks.worker.postMessage({
          action: 'updateHistory',
          pageData: data
        })
      }
    }, 500)
  },
  callbacks: [],
  addWorkerCallback: function (callback) {
    const callbackId = Date.now()
    bookmarks.callbacks.push({id: callbackId, fn: callback})
    return callbackId
  },
  runWorkerCallback: function (id, data) {
    for (var i = 0; i < bookmarks.callbacks.length; i++) {
      if (bookmarks.callbacks[i].id === id) {
        bookmarks.callbacks[i].fn(data)
        bookmarks.callbacks.splice(i, 1)
      }
    }
  },
  deleteHistory: function (url) {
    bookmarks.worker.postMessage({
      action: 'deleteHistory',
      pageData: {
        url: url
      }
    })
  },
  searchPlaces: function (text, callback, options) {
    const callbackId = bookmarks.addWorkerCallback(callback)
    bookmarks.worker.postMessage({
      action: 'searchPlaces',
      text: text,
      callbackId: callbackId,
      options: options
    })
  },
  searchPlacesFullText: function (text, callback) {
    const callbackId = bookmarks.addWorkerCallback(callback)
    bookmarks.worker.postMessage({
      action: 'searchPlacesFullText',
      text: text,
      callbackId: callbackId
    })
  },
  getPlaceSuggestions: function (url, callback) {
    const callbackId = bookmarks.addWorkerCallback(callback)
    bookmarks.worker.postMessage({
      action: 'getPlaceSuggestions',
      text: url,
      callbackId: callbackId
    })
  },
  onMessage: function (e) { // assumes this is from a search operation
    bookmarks.runWorkerCallback(e.data.callbackId, e.data.result)
  },
  updateBookmarkState: function (url, shouldBeBookmarked) {
    bookmarks.worker.postMessage({
      action: 'updateBookmarkState',
      pageData: {
        url: url,
        shouldBeBookmarked: shouldBeBookmarked
      }
    })
  },
  toggleBookmarked: function (tabId) { // Toggles whether a URL is bookmarked or not
    const url = tabs.get(tabId).url

    db.places.where('url').equals(url).first(function (item) {
      if (item && item.isBookmarked) {
        bookmarks.updateBookmarkState(url, false)
      } else {
        bookmarks.updateBookmarkState(url, true)
      }
    })
  },
  init: function () {
    bookmarks.worker = new Worker('js/bookmarksHistory/placesWorker.js')
    bookmarks.worker.onmessage = bookmarks.onMessage
  }
}

window.bookmarks = bookmarks

bookmarks.init()
