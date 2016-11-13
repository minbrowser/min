var bookmarks = {
  updateHistory: function (tabId, extractedText, metadata) {
    /* this prevents pages that are immediately left from being saved to history, and also gives the page-favicon-updated event time to fire (so the colors saved to history are correct). */
    setTimeout(function () {
      var tab = tabs.get(tabId)
      if (tab) {
        var data = {
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
    var callbackId = Date.now()
    bookmarks.callbacks.push({id: callbackId, fn: callback})
    return callbackId
  },
  runWorkerCallback: function (id, data) {
    for (var i = 0; i < bookmarks.callbacks.length; i++) {
      if (bookmarks.callbacks[i].id == id) {
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
  searchPlaces: function (text, callback) {
    var callbackId = bookmarks.addWorkerCallback(callback)
    bookmarks.worker.postMessage({
      action: 'searchPlaces',
      text: text,
      callbackId: callbackId
    })
  },
  searchPlacesFullText: function (text, callback) {
    var callbackId = bookmarks.addWorkerCallback(callback)
    bookmarks.worker.postMessage({
      action: 'searchPlacesFullText',
      text: text,
      callbackId: callbackId
    })
  },
  getPlaceSuggestions: function (url, callback) {
    var callbackId = bookmarks.addWorkerCallback(callback)
    bookmarks.worker.postMessage({
      action: 'getPlaceSuggestions',
      text: url,
      callbackId: callbackId
    })
  },
  onMessage: function (e) { // assumes this is from a search operation
    bookmarks.runWorkerCallback(e.data.callbackId, e.data.result)
  },
  updateBookmarkState: function (tabId, shouldBeBookmarked) {
    var url = tabs.get(tabId).url
    db.places.where('url').equals(url).first(function (item) {
      // a history item already exists, update it
      if (item) {
        db.places.where('url').equals(url).modify({isBookmarked: shouldBeBookmarked})
      } else {
        // create a new history item
        // this should only happen if the page hasn't finished loading yet
        db.places.add({
          url: url,
          title: url,
          color: '',
          visitCount: 1,
          lastVisit: Date.now(),
          pageHTML: '',
          extractedText: '',
          searchIndex: [],
          isBookmarked: shouldBeBookmarked,
          metadata: {}
        })
      }
    })
  },
  bookmark: function (tabId) {
    bookmarks.updateBookmarkState(tabId, true)
  },
  deleteBookmark: function (tabId) {
    bookmarks.updateBookmarkState(tabId, false)
  },
  toggleBookmarked: function (tabId) { // toggles a bookmark. If it is bookmarked, delete the bookmark. Otherwise, add it.
    var url = tabs.get(tabId).url

    db.places.where('url').equals(url).first(function (item) {
      if (item && item.isBookmarked) {
        bookmarks.deleteBookmark(tabId)
      } else {
        bookmarks.bookmark(tabId)
      }
    })
  },
  handleStarClick: function (star) {
    star.classList.toggle('fa-star')
    star.classList.toggle('fa-star-o')

    bookmarks.toggleBookmarked(star.getAttribute('data-tab'))
  },
  getStar: function (tabId) {
    var star = document.createElement('i')
    star.setAttribute('data-tab', tabId)
    star.className = 'fa fa-star-o bookmarks-button' // alternative icon is fa-bookmark

    star.addEventListener('click', function (e) {
      bookmarks.handleStarClick(e.target)
    })

    return bookmarks.renderStar(tabId, star)
  },
  renderStar: function (tabId, star) { // star is optional
    star = star || document.querySelector('.bookmarks-button[data-tab="{id}"]'.replace('{id}', tabId))

    var currentURL = tabs.get(tabId).url

    if (!currentURL || currentURL === 'about:blank') { // no url, can't be bookmarked
      star.hidden = true
      return star
    } else {
      star.hidden = false
    }

    // check if the page is bookmarked or not, and update the star to match

    db.places.where('url').equals(currentURL).first(function (item) {
      if (item && item.isBookmarked) {
        star.classList.remove('fa-star-o')
        star.classList.add('fa-star')
      } else {
        star.classList.remove('fa-star')
        star.classList.add('fa-star-o')
      }
    })
    return star
  },
  init: function () {
    bookmarks.worker = new Worker('js/bookmarksHistory/placesWorker.js')
    bookmarks.worker.onmessage = bookmarks.onMessage
  }
}

bookmarks.init()
