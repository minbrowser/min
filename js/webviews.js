/* implements selecting webviews, switching between them, and creating new ones. */

// the permissionRequestHandler used for webviews
function pagePermissionRequestHandler (webContents, permission, callback) {
  if (permission === 'notifications' || permission === 'fullscreen') {
    callback(true)
  } else {
    callback(false)
  }
}

// set the permissionRequestHandler for non-private tabs

remote.session.defaultSession.setPermissionRequestHandler(pagePermissionRequestHandler)

// called whenever the page url changes

function onPageLoad (e) {
  var _this = this
  setTimeout(function () { // TODO convert to arrow function
    /* add a small delay before getting these attributes, because they don't seem to update until a short time after the did-finish-load event is fired. Fixes #320 */

    var tab = _this.getAttribute('data-tab')
    var url = _this.getAttribute('src') // src attribute changes whenever a page is loaded

    // if the page is an error page, the URL is really the value of the "url" query parameter
    if (url.startsWith(webviews.internalPages.error) || url.startsWith(webviews.internalPages.crash)) {
      url = new URLSearchParams(new URL(url).search).get('url')
    }

    if (url.indexOf('https://') === 0 || url.indexOf('about:') === 0 || url.indexOf('chrome:') === 0 || url.indexOf('file://') === 0) {
      tabs.update(tab, {
        secure: true,
        url: url
      })
    } else {
      tabs.update(tab, {
        secure: false,
        url: url
      })
    }

    tabBar.rerenderTab(tab)
  }, 0)
}

var webviews = {
  container: document.getElementById('webviews'),
  elementMap: {}, // tabId: webview
  internalPages: {
    crash: 'file://' + __dirname + '/pages/crash/index.html',
    error: 'file://' + __dirname + '/pages/error/index.html'
  },
  events: [],
  IPCEvents: [],
  bindEvent: function (event, fn, useWebContents) {
    webviews.events.push({
      event: event,
      fn: fn,
      useWebContents: useWebContents
    })
  },
  bindIPC: function (name, fn) {
    webviews.IPCEvents.push({
      name: name,
      fn: fn
    })
  },
  getDOM: function (options) {
    var w = document.createElement('webview')
    w.setAttribute('preload', 'dist/webview.min.js')

    w.setAttribute('webpreferences', 'scrollBounce=yes')

    if (options.url) {
      w.setAttribute('src', urlParser.parse(options.url))
    }

    w.setAttribute('data-tab', options.tabId)

    // if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
    // since tab IDs are unique, we can use them as partition names
    if (tabs.get(options.tabId).private === true) {
      var partition = options.tabId.toString() // options.tabId is a number, which remote.session.fromPartition won't accept. It must be converted to a string first

      w.setAttribute('partition', partition)

      // register permissionRequestHandler for this tab
      // private tabs use a different session, so the default permissionRequestHandler won't apply

      remote.session.fromPartition(partition).setPermissionRequestHandler(pagePermissionRequestHandler)

      // enable ad/tracker/contentType blocking in this tab if needed

      registerFiltering(partition)
    }

    // webview events

    webviews.events.forEach(function (ev) {
      if (ev.useWebContents) { // some events (such as context-menu) are only available on the webContents rather than the webview element
        w.addEventListener('did-attach', function () {
          this.getWebContents().on(ev.event, function () {
            ev.fn.apply(w, arguments)
          })
        })
      } else {
        w.addEventListener(ev.event, ev.fn)
      }
    })

    w.addEventListener('page-favicon-updated', function (e) {
      var id = this.getAttribute('data-tab')
      updateTabColor(e.favicons, id)
    })

    w.addEventListener('page-title-set', function (e) {
      var tab = this.getAttribute('data-tab')
      tabs.update(tab, {
        title: e.title
      })
      tabBar.rerenderTab(tab)
    })

    w.addEventListener('did-finish-load', onPageLoad)
    w.addEventListener('did-navigate-in-page', onPageLoad)

    w.addEventListener('load-commit', function (e) {
      if (e.isMainFrame) {
        tabBar.handleProgressBar(this.getAttribute('data-tab'), 'start')
      }
      /* workaround for https://github.com/electron/electron/issues/8505 and similar issues */
      this.classList.add('loading')
      this.setAttribute('last-load-event', Date.now().toString())
    })

    w.addEventListener('did-stop-loading', function () {
      tabBar.handleProgressBar(this.getAttribute('data-tab'), 'finish')

      this.setAttribute('last-load-event', Date.now().toString())
      // only set webviews to hidden if no load events have occurred for 15 seconds because of https://github.com/electron/electron/issues/8505
      setTimeout(function () {
        if (Date.now() - parseInt(w.getAttribute('last-load-event')) > 14000) {
          w.classList.remove('loading')
        }
      }, 15000)
    })

    // open links in new tabs

    w.addEventListener('new-window', function (e) {
      var tab = this.getAttribute('data-tab')
      var currentIndex = tabs.getIndex(tabs.getSelected())

      var newTab = tabs.add({
        url: e.url,
        private: tabs.get(tab).private // inherit private status from the current tab
      }, currentIndex + 1)
      addTab(newTab, {
        enterEditMode: false,
        openInBackground: e.disposition === 'background-tab' // possibly open in background based on disposition
      })
    })

    w.addEventListener('close', function (e) {
      closeTab(this.getAttribute('data-tab'))
    })

    w.addEventListener('ipc-message', function (e) {
      var w = this
      var tab = this.getAttribute('data-tab')

      webviews.IPCEvents.forEach(function (item) {
        if (item.name === e.channel) {
          item.fn(w, tab, e.args)
        }
      })
    })

    w.addEventListener('crashed', function (e) {
      var tabId = this.getAttribute('data-tab')
      var url = this.getAttribute('src')

      tabs.update(tabId, {
        url: webviews.internalPages.crash + '?url=' + encodeURIComponent(url)
      })

      // the existing process has crashed, so we can't reuse it
      webviews.destroy(tabId)
      webviews.add(tabId)

      if (tabId === tabs.getSelected()) {
        webviews.setSelected(tabId)
      }
    })

    w.addEventListener('did-fail-load', function (e) {
      if (e.errorCode !== -3 && e.validatedURL === e.target.getURL()) {
        navigate(this.getAttribute('data-tab'), webviews.internalPages.error + '?ec=' + encodeURIComponent(e.errorCode) + '&url=' + encodeURIComponent(e.target.getURL()))
      }
    })

    w.addEventListener('enter-html-full-screen', function (e) {
      this.classList.add('fullscreen')
    })

    w.addEventListener('leave-html-full-screen', function (e) {
      this.classList.remove('fullscreen')
    })

    return w
  },
  add: function (tabId) {
    var tabData = tabs.get(tabId)

    var webview = webviews.getDOM({
      tabId: tabId,
      url: tabData.url
    })

    webviews.elementMap[tabId] = webview

    // this is used to hide the webview while still letting it load in the background
    // webviews are hidden when added - call webviews.setSelected to show it
    webview.classList.add('hidden')
    webview.classList.add('loading')

    webviews.container.appendChild(webview)

    return webview
  },
  setSelected: function (id) {
    var webviewEls = document.getElementsByTagName('webview')
    for (var i = 0; i < webviewEls.length; i++) {
      webviewEls[i].classList.add('hidden')
      webviewEls[i].setAttribute('aria-hidden', 'true')
    }

    var wv = webviews.get(id)

    if (!wv) {
      wv = webviews.add(id)
    }

    wv.classList.remove('hidden')
    wv.removeAttribute('aria-hidden')
  },
  update: function (id, url) {
    webviews.get(id).setAttribute('src', urlParser.parse(url))
  },
  destroy: function (id) {
    var w = webviews.elementMap[id]
    if (w) {
      var partition = w.getAttribute('partition')
      if (partition) {
        remote.session.fromPartition(partition).destroy()
      }
      w.parentNode.removeChild(w)
    }
    delete webviews.elementMap[id]
  },
  get: function (id) {
    return webviews.elementMap[id]
  }
}

// called when js/webview/textExtractor.js returns the page's text content
webviews.bindIPC('pageData', function (webview, tabId, args) {
  var tab = tabs.get(tabId),
    data = args[0]

  var isInternalPage = tab.url.indexOf(__dirname) !== -1 && tab.url.indexOf(readerView.readerURL) === -1

  // don't save to history if in private mode, or the page is a browser page
  if (tab.private === false && !isInternalPage) {
    bookmarks.updateHistory(tabId, data.extractedText, data.metadata)
  }
})

// called when a swipe event is triggered in js/webview/swipeEvents.js

webviews.bindIPC('goBack', function () {
  settings.get('swipeNavigationEnabled', function (value) {
    if (value === true || value === undefined) {
      webviews.get(tabs.getSelected()).goBack()
    }
  })
})

webviews.bindIPC('goForward', function () {
  settings.get('swipeNavigationEnabled', function (value) {
    if (value === true || value === undefined) {
      webviews.get(tabs.getSelected()).goForward()
    }
  })
})

/* workaround for https://github.com/electron/electron/issues/3471 */

webviews.bindEvent('did-get-redirect-request', function (e, oldURL, newURL, isMainFrame, httpResponseCode, requestMethod, referrer, header) {
  if (isMainFrame && httpResponseCode === 302 && requestMethod === 'POST') {
    this.stop()
    var _this = this
    setTimeout(function () {
      _this.loadURL(newURL)
    }, 0)
  }
}, true)
