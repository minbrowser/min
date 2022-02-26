var webviews = require('webviews.js')
var keybindings = require('keybindings.js')
var urlParser = require('util/urlParser.js')

var readerDecision = require('readerDecision.js')

var readerView = {
  readerURL: urlParser.getFileURL(__dirname + '/reader/index.html'),
  getReaderURL: function (url) {
    return readerView.readerURL + '?url=' + url
  },
  isReader: function (tabId) {
    return tabs.get(tabId).url.indexOf(readerView.readerURL) === 0
  },
  getButton: function (tabId) {
    // TODO better icon
    var button = document.createElement('button')
    button.className = 'reader-button tab-icon i carbon:notebook'

    button.setAttribute('data-tab', tabId)
    button.setAttribute('role', 'button')

    button.addEventListener('click', function (e) {
      e.stopPropagation()

      if (readerView.isReader(tabId)) {
        readerView.exit(tabId)
      } else {
        readerView.enter(tabId)
      }
    })

    readerView.updateButton(tabId, button)

    return button
  },
  updateButton: function (tabId, button) {
    var button = button || document.querySelector('.reader-button[data-tab="{id}"]'.replace('{id}', tabId))
    var tab = tabs.get(tabId)

    if (readerView.isReader(tabId)) {
      button.classList.add('is-reader')
      button.setAttribute('title', l('exitReaderView'))
    } else {
      button.classList.remove('is-reader')
      button.setAttribute('title', l('enterReaderView'))

      if (tab.readerable) {
        button.classList.add('can-reader')
      } else {
        button.classList.remove('can-reader')
      }
    }
  },
  enter: function (tabId, url) {
    var newURL = readerView.readerURL + '?url=' + encodeURIComponent(url || tabs.get(tabId).url)
    tabs.update(tabId, { url: newURL })
    webviews.update(tabId, newURL)
  },
  exit: function (tabId) {
    var src = urlParser.getSourceURL(tabs.get(tabId).url)
    // this page should not be automatically readerable in the future
    readerDecision.setURLStatus(src, false)
    tabs.update(tabId, { url: src })
    webviews.update(tabId, src)
  },
  printArticle: function (tabId) {
    if (!readerView.isReader(tabId)) {
      throw new Error("attempting to print in a tab that isn't a reader page")
    }

    webviews.callAsync(tabs.getSelected(), 'executeJavaScript', 'parentProcessActions.printArticle()')
  },
  initialize: function () {
    // update the reader button on page load

    webviews.bindEvent('did-start-navigation', function (tabId, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) {
      if (isInPlace) {
        return
      }
      if (readerDecision.shouldRedirect(url) === 1) {
        // if this URL has previously been marked as readerable, load reader view without waiting for the page to load
        readerView.enter(tabId, url)
      } else if (isMainFrame) {
        tabs.update(tabId, {
          readerable: false // assume the new page can't be readered, we'll get another message if it can
        })

        readerView.updateButton(tabId)
      }
    })

    webviews.bindIPC('canReader', function (tab) {
      if (readerDecision.shouldRedirect(tabs.get(tab).url) >= 0) {
        // if automatic reader mode has been enabled for this domain, and the page is readerable, enter reader mode
        readerView.enter(tab)
      }

      tabs.update(tab, {
        readerable: true
      })
      readerView.updateButton(tab)
    })

    // add a keyboard shortcut to enter reader mode

    keybindings.defineShortcut('toggleReaderView', function () {
      if (readerView.isReader(tabs.getSelected())) {
        readerView.exit(tabs.getSelected())
      } else {
        readerView.enter(tabs.getSelected())
      }
    })
  }
}

readerView.initialize()

module.exports = readerView
