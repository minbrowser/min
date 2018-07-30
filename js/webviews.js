/* implements selecting webviews, switching between them, and creating new ones. */

var createView = remote.getGlobal('createView')
var destroyView = remote.getGlobal('destroyView')
var getView = remote.getGlobal('getView')
var getContents = remote.getGlobal('getContents')

var windowIsFullscreen = false // TODO track this for each individual webContents

function lazyRemoteObject (getObject) {
  var cachedItem = null
  return new Proxy({}, {
    get: function (obj, prop) {
      if (!cachedItem) {
        cachedItem = getObject()
      }
      return cachedItem[prop]
    }
  })
}

// the permissionRequestHandler used for webviews
function pagePermissionRequestHandler (webContents, permission, callback) {
  if (permission === 'notifications' || permission === 'fullscreen') {
    callback(true)
  } else {
    callback(false)
  }
}

function getViewBounds () {
  if (windowIsFullscreen) {
    return {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight
    }
  }
  return {
    x: 0,
    y: 36, // TODO adjust based on platform
    width: window.innerWidth,
    height: window.innerHeight - 36
  }
}

// set the permissionRequestHandler for non-private tabs

remote.session.defaultSession.setPermissionRequestHandler(pagePermissionRequestHandler)

// called whenever the page url changes

function onPageLoad (e) {
  var _this = this
  setTimeout(function () { // TODO convert to arrow function
    /* add a small delay before getting these attributes, because they don't seem to update until a short time after the did-finish-load event is fired. Fixes #320 */

    // var tab = _this.getAttribute('data-tab')
    // var url = _this.getAttribute('src') // src attribute changes whenever a page is loaded
    var tab = webviews.getTabFromContents(_this)
    var url = _this.getURL()

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

window.webviews = {
  container: document.getElementById('webviews'),
  elementMap: {}, // tabId: webview
  tabViewMap: {}, // tabId: browserView
  tabContentsMap: {}, // tabId: webContents
  selectedId: null,
  placeholderRequests: [],
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
    w.setAttribute('preload', 'dist/preload.js')

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

    // open links in new tabs

    /*w.addEventListener('new-window', function (e) {
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
    })*/

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

    return w
  },
  add: function (tabId) {
    var tabData = tabs.get(tabId)

    // if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
    // since tab IDs are unique, we can use them as partition names
    if (tabs.get(tabId).private === true) {
      var partition = tabId.toString() // options.tabId is a number, which remote.session.fromPartition won't accept. It must be converted to a string first

      // register permissionRequestHandler for this tab
      // private tabs use a different session, so the default permissionRequestHandler won't apply

      remote.session.fromPartition(partition).setPermissionRequestHandler(pagePermissionRequestHandler)

      // enable ad/tracker/contentType blocking in this tab if needed

      registerFiltering(partition)
    }

    ipc.send('createView', {
      id: tabId,
      webPreferencesString: JSON.stringify({
        webPreferences: {
          nodeIntegration: false,
          scrollBounce: true,
          preload: __dirname + '/dist/preload.js', // TODO fix on windows
          allowPopups: false,
          partition: partition
        }
      }),
      boundsString: JSON.stringify(getViewBounds()),
      events: webviews.events
    })
    /*
        let view = createView(
          tabId,
          JSON.stringify({
            webPreferences: {
              nodeIntegration: false,
              scrollBounce: true,
              preload: __dirname + '/dist/preload.js', // TODO fix on windows
              allowPopups: false,
              partition: partition
            }
          }),
          JSON.stringify(getViewBounds()),
          webviews.events
        )
        */

    let view = lazyRemoteObject(function () {
      return getView(tabId)
    })

    let contents = lazyRemoteObject(function () {
      return getView(tabId).webContents
    })

    /*    contents.on('ipc-message', function (e, args) {
          var w = this
          var tab = webviews.getTabFromContents(this)

          webviews.IPCEvents.forEach(function (item) {
            if (item.name === args[0]) {
              item.fn(w, tab, args[1])
            }
          })
        })*/

    // contents.loadURL(tabData.url)
    webviews.callAsync(tabData.id, 'loadURL', tabData.url)

    webviews.tabViewMap[tabId] = view
    webviews.tabContentsMap[tabId] = contents
    return view
  },
  setSelected: function (id) {
    webviews.selectedId = id

    // create the view if it doesn't already exist
    if (!webviews.getView(id)) {
      webviews.add(id)
    }

    if (webviews.placeholderRequestCount > 0) {
      return
    }

    ipc.send('setView', {
      id: id,
      bounds: getViewBounds()
    })

  // mainWindow.setBrowserView(view)
  // view.setBounds(getViewBounds())
  },
  update: function (id, url) {
    webviews.get(id).loadURL(urlParser.parse(url))
  },
  destroy: function (id) {
    var w = webviews.tabViewMap[id]
    if (w) {
      ipc.send('destroyView', id)
    /*if (id === webviews.selectedId) {
      mainWindow.setBrowserView(null)
      webviews.selectedId = null
    }
    w.destroy()
    */
    }
    delete webviews.tabViewMap[id]
    delete webviews.tabContentsMap[id]
  },
  getView: function (id) {
    return webviews.tabViewMap[id]
  },
  get: function (id) {
    return webviews.tabContentsMap[id]
  },
  requestPlaceholder: function (reason) {
    if (!webviews.placeholderRequests.includes(reason)) {
      webviews.placeholderRequests.push(reason)
    }
    ipc.send('hideView', webviews.selectedId)
  },
  hidePlaceholder: function (reason) {
    webviews.placeholderRequests.splice(webviews.placeholderRequests.indexOf(reason), 1)

    if (webviews.placeholderRequests.length === 0) {
      // multiple things can request a placeholder at the same time, but we should only show the view again if nothing requires a placeholder anymore
      if (webviews.tabViewMap[webviews.selectedId]) {
        ipc.send('showView', webviews.selectedId)
      }
    }
  },
  getTabFromContents: function (contents) {
    for (let tabId in webviews.tabContentsMap) {
      if (webviews.tabContentsMap[tabId] === contents) {
        return tabId
      }
    }
    return null
  },
  releaseFocus: function () {
    mainWindow.webContents.focus()
  },
  focus: function (id) {
    ipc.send('focusView', id)
  },
  callAsync: function (id, method, arg) {
    ipc.send('callViewMethod', {id: id, method: method, arg: arg})
  }
}

// called when js/preload/textExtractor.js returns the page's text content
webviews.bindIPC('pageData', function (webview, tabId, args) {
  var tab = tabs.get(tabId),
    data = args[0]

  var isInternalPage = tab.url.indexOf(__dirname) !== -1 && tab.url.indexOf(readerView.readerURL) === -1

  // don't save to history if in private mode, or the page is a browser page
  if (tab.private === false && !isInternalPage) {
    bookmarks.updateHistory(tabId, data.extractedText, data.metadata)
  }
})

// called when a swipe event is triggered in js/preload/swipeEvents.js

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

webviews.bindEvent('new-window', function (e, url, frameName, disposition) {
  // e.preventDefault()
  // TODO reenable this?
  var tab = webviews.getTabFromContents(this)
  var currentIndex = tabs.getIndex(tabs.getSelected())

  var newTab = tabs.add({
    url: url,
    private: tabs.get(tab).private // inherit private status from the current tab
  }, currentIndex + 1)
  addTab(newTab, {
    enterEditMode: false,
    openInBackground: disposition === 'background-tab' // possibly open in background based on disposition
  })
})

window.addEventListener('resize', throttle(function () {
  ipc.send('setBounds', {id: tabs.getSelected(), bounds: getViewBounds()})
}, 100))

mainWindow.on('enter-html-full-screen', function () {
  windowIsFullscreen = true
  ipc.send('setBounds', {id: tabs.getSelected(), bounds: getViewBounds()})
})

mainWindow.on('leave-html-full-screen', function () {
  windowIsFullscreen = false
  ipc.send('setBounds', {id: tabs.getSelected(), bounds: getViewBounds()})
})

webviews.bindEvent('did-finish-load', onPageLoad)
webviews.bindEvent('did-navigate-in-page', onPageLoad)

webviews.bindEvent('page-favicon-updated', function (e, favicons) {
  var id = webviews.getTabFromContents(this)
  updateTabColor(favicons, id)
})

webviews.bindEvent('page-title-updated', function (e, title, explicitSet) {
  var tab = webviews.getTabFromContents(this)
  tabs.update(tab, {
    title: title
  })
  tabBar.rerenderTab(tab)
})

webviews.bindEvent('did-start-loading', function () {
  tabBar.handleProgressBar(webviews.getTabFromContents(this), 'start')
})

webviews.bindEvent('did-stop-loading', function () {
  tabBar.handleProgressBar(webviews.getTabFromContents(this), 'finish')
})

webviews.bindEvent('did-fail-load', function (e, errorCode, errorDesc, validatedURL, isMainFrame) {
  if (errorCode !== -3 && isMainFrame) {
    navigate(webviews.getTabFromContents(this), webviews.internalPages.error + '?ec=' + encodeURIComponent(errorCode) + '&url=' + encodeURIComponent(validatedURL))
  }
})

webviews.bindEvent('crashed', function (e, isKilled) {
  var tabId = webviews.getTabFromContents(this)
  var url = tabs.get(tabId).url

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

/* forward key events from the BrowserView to the main window */

webviews.bindIPC('receive-event', function (view, tab, ev) {
  ev = JSON.parse(ev[0])
  ev.target = webviews.container
  var event = new KeyboardEvent(ev.type, ev)

  // https://stackoverflow.com/questions/10455626/keydown-simulation-in-chrome-fires-normally-but-not-the-correct-key/10520017#10520017
  Object.defineProperty(event, 'keyCode', {
    get: function () {
      return ev.keyCode
    }
  })
  Object.defineProperty(event, 'which', {
    get: function () {
      return ev.which
    }
  })
  webviews.container.dispatchEvent(event)
})

ipc.on('view-event', function (e, args) {
  webviews.events.forEach(function (ev) {
    if (ev.event === args.name) {
      ev.fn.apply(webviews.tabContentsMap[args.id], [e].concat(args.args))
    }
  })
})

ipc.on('view-ipc', function (e, data) {
  webviews.IPCEvents.forEach(function (item) {
    if (item.name === data.name) {
      item.fn(webviews.tabContentsMap[data.id], data.id, [data.data])
    }
  })
})
