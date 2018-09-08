var browserUI = require('api-wrapper.js')
const previewCache = require('previewCache.js')
var getView = remote.getGlobal('getView')

/* implements selecting webviews, switching between them, and creating new ones. */

var placeholderImg = document.getElementById('webview-placeholder')

var windowIsFullscreen = false // TODO track this for each individual webContents

if (window.platformType === 'windows') {
  var navbarHeight = 46 // used to set the bounds of the view
} else {
  var navbarHeight = 36
}

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

function forceUpdateDragRegions () {
  // manually force the drag regions to update to work around https://github.com/electron/electron/issues/14038
  var d = document.createElement('div')
  d.setAttribute('style', '-webkit-app-region:drag; width: 1px; height: 1px;')
  document.body.appendChild(d)
  setTimeout(function () {
    document.body.removeChild(d)
  }, 100)
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
    y: navbarHeight,
    width: window.innerWidth,
    height: window.innerHeight - 36
  }
}

function captureCurrentTab (options) {
  if (webviews.placeholderRequests.length > 0 && !(options && options.forceCapture === true)) {
    // capturePage doesn't work while the view is hidden
    return
  }

  ipc.send('getCapture', {
    id: webviews.selectedId,
    width: Math.round(window.innerWidth / 10),
    height: Math.round(window.innerHeight / 10)
  })
}

function updateBackButton () {
  if(!tabs.get(tabs.getSelected()).url) {
    goBackButton.disabled = true;
    return;
  }
  webviews.callAsync(tabs.getSelected(), 'canGoBack', null, function (canGoBack) {
    goBackButton.disabled = !canGoBack
  })
}

// set the permissionRequestHandler for non-private tabs

remote.session.defaultSession.setPermissionRequestHandler(pagePermissionRequestHandler)

// called whenever the page url changes

function onPageLoad (e) {
  var tab = webviews.getTabFromContents(this)

  webviews.callAsync(tab, 'getURL', null, function (url) {
    // capture a preview image if a new page has been loaded
    if (tab === tabs.getSelected() && tabs.get(tab).url !== url) {
      setTimeout(function () {
        // sometimes the page isn't visible until a short time after the did-finish-load event occurs
        captureCurrentTab()
      }, 100)
    }

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

    updateBackButton()
  })
}

// called whenever a navigation finishes

function onNavigate () {
  updateBackButton()
}

window.webviews = {
  tabViewMap: {}, // tabId: browserView
  tabContentsMap: {}, // tabId: webContents
  selectedId: null,
  placeholderRequests: [],
  asyncCallbacks: {},
  internalPages: {
    crash: 'file://' + __dirname + '/pages/crash/index.html',
    error: 'file://' + __dirname + '/pages/error/index.html'
  },
  events: [],
  IPCEvents: [],
  bindEvent: function (event, fn, options) {
    webviews.events.push({
      event: event,
      fn: fn,
      options: options
    })
  },
  bindIPC: function (name, fn) {
    webviews.IPCEvents.push({
      name: name,
      fn: fn
    })
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
          preload: __dirname + '/dist/preload.js',
          allowPopups: false,
          partition: partition
        }
      }),
      boundsString: JSON.stringify(getViewBounds()),
      events: webviews.events
    })

    let view = lazyRemoteObject(function () {
      return getView(tabId)
    })

    let contents = lazyRemoteObject(function () {
      return getView(tabId).webContents
    })

    if (tabData.url) {
      webviews.callAsync(tabData.id, 'loadURL', tabData.url)
    }

    webviews.tabViewMap[tabId] = view
    webviews.tabContentsMap[tabId] = contents
    return view
  },
  setSelected: function (id, options) { // options.focus - whether to focus the view. Defaults to true.
    webviews.selectedId = id

    // create the view if it doesn't already exist
    if (!webviews.getView(id)) {
      webviews.add(id)
    }

    updateBackButton()

    if (webviews.placeholderRequests.length > 0) {
      return
    }

    ipc.send('setView', {
      id: id,
      bounds: getViewBounds(),
      focus: !options || options.focus !== false
    })

    forceUpdateDragRegions()
  },
  update: function (id, url) {
    webviews.callAsync(id, 'loadURL', urlParser.parse(url))
  },
  destroy: function (id) {
    var w = webviews.tabViewMap[id]
    if (w) {
      ipc.send('destroyView', id)
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
    if (webviews.placeholderRequests.length === 1) {
      // create a new placeholder

      var img = previewCache.get(webviews.selectedId)
      var associatedTab = tabs.get(webviews.selectedId)
      if (img) {
        placeholderImg.src = img
        placeholderImg.hidden = false
      } else if (associatedTab && associatedTab.url && associatedTab.url !== 'about:blank') {
        captureCurrentTab({forceCapture: true})
      } else {
        placeholderImg.hidden = true
      }
    }
    setTimeout(function () {
      ipc.send('hideCurrentView')
    }, 0)
  },
  hidePlaceholder: function (reason) {
    webviews.placeholderRequests.splice(webviews.placeholderRequests.indexOf(reason), 1)

    if (webviews.placeholderRequests.length === 0) {
      // multiple things can request a placeholder at the same time, but we should only show the view again if nothing requires a placeholder anymore
      if (webviews.tabViewMap[webviews.selectedId]) {
        ipc.send('setView', {
          id: webviews.selectedId,
          bounds: getViewBounds(),
          focus: true
        })
        forceUpdateDragRegions()
      }
      // wait for the view to be visible before removing the placeholder
      setTimeout(function () {
        if (webviews.placeholderRequests.length === 0) { // make sure the placeholder hasn't been re-enabled
          placeholderImg.hidden = true
        }
      }, 200)
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
    ipc.send('focusMainWebContents')
  },
  focus: function (id) {
    ipc.send('focusView', id)
  },
  callAsync: function (id, method, args, callback) {
    if (!(args instanceof Array)) {
      args = [args]
    }
    if (callback) {
      var callId = Math.random()
      webviews.asyncCallbacks[callId] = callback
    }
    ipc.send('callViewMethod', {id: id, callId: callId, method: method, args: args})
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

webviews.bindEvent('new-window', function (e, url, frameName, disposition) {
  var tab = webviews.getTabFromContents(this)
  var currentIndex = tabs.getIndex(tabs.getSelected())

  var newTab = tabs.add({
    url: url,
    private: tabs.get(tab).private // inherit private status from the current tab
  }, currentIndex + 1)
  browserUI.addTab(newTab, {
    enterEditMode: false,
    openInBackground: disposition === 'background-tab' // possibly open in background based on disposition
  })
}, {preventDefault: true})

window.addEventListener('resize', throttle(function () {
  ipc.send('setBounds', {id: webviews.selectedId, bounds: getViewBounds()})
}, 100))

ipc.on('enter-html-full-screen', function () {
  windowIsFullscreen = true
  ipc.send('setBounds', {id: webviews.selectedId, bounds: getViewBounds()})
})

ipc.on('leave-html-full-screen', function () {
  windowIsFullscreen = false
  ipc.send('setBounds', {id: webviews.selectedId, bounds: getViewBounds()})
})

webviews.bindEvent('did-finish-load', onPageLoad)
webviews.bindEvent('did-navigate-in-page', onPageLoad)
webviews.bindEvent('did-navigate', onNavigate)

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
  if (errorCode && errorCode !== -3 && isMainFrame && validatedURL) {
    browserUI.navigate(webviews.getTabFromContents(this), webviews.internalPages.error + '?ec=' + encodeURIComponent(errorCode) + '&url=' + encodeURIComponent(validatedURL))
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

webviews.bindIPC('close-window', function (webview, tabId, args) {
  browserUI.closeTab(tabId)
})

ipc.on('view-event', function (e, args) {
  webviews.events.forEach(function (ev) {
    if (ev.event === args.name) {
      ev.fn.apply(webviews.tabContentsMap[args.id], [e].concat(args.args))
    }
  })
})

ipc.on('async-call-result', function (e, args) {
  webviews.asyncCallbacks[args.callId](args.data)
  delete webviews.asyncCallbacks[args.callId]
})

ipc.on('view-ipc', function (e, data) {
  webviews.IPCEvents.forEach(function (item) {
    if (item.name === data.name) {
      item.fn(webviews.tabContentsMap[data.id], data.id, [data.data])
    }
  })
})

setInterval(function () {
  captureCurrentTab()
}, 30000)

ipc.on('captureData', function (e, data) {
  previewCache.set(data.id, data.url)
  if (data.id === webviews.selectedId && webviews.placeholderRequests.length > 0) {
    placeholderImg.src = data.url
    placeholderImg.hidden = false
  }
})

/* focus the view when the window is focused */

window.addEventListener('focus', function () {
  if (document.activeElement === document.body) {
    webviews.focus(webviews.selectedId)
  }
})
