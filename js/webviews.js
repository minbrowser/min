const previewCache = require('previewCache.js')
var getView = remote.getGlobal('getView')
var urlParser = require('util/urlParser.js')
var settings = require('util/settings/settings.js')

/* implements selecting webviews, switching between them, and creating new ones. */

var placeholderImg = document.getElementById('webview-placeholder')

var hasSeparateTitlebar = settings.get('useSeparateTitlebar')
var windowIsMaximized = false // affects navbar height on Windows
var windowIsFullscreen = false

function lazyRemoteObject (getObject) {
  var cachedItem = null
  return new Proxy({}, {
    get: function (obj, prop) {
      if (!cachedItem) {
        cachedItem = getObject()
      }
      return cachedItem[prop]
    },
    set: function (obj, prop, value) {
      if (!cachedItem) {
        cachedItem = getObject()
      }
      cachedItem[prop] = value
    }
  })
}

function forceUpdateDragRegions () {
  setTimeout(function () {
    // manually force the drag regions to update to work around https://github.com/electron/electron/issues/14038
    var d = document.createElement('div')
    d.setAttribute('style', '-webkit-app-region:drag; width: 1px; height: 1px;')
    document.body.appendChild(d)
    setTimeout(function () {
      document.body.removeChild(d)
    }, 100)
  }, 100)
}

function captureCurrentTab (options) {
  if (tabs.get(tabs.getSelected()).private) {
    // don't capture placeholders for private tabs
    return
  }

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

// called whenever a new page starts loading, or an in-page navigation occurs
function onPageURLChange (tab, url) {
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
}

// called whenever a navigation finishes
function onNavigate (tabId, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) {
  if (isMainFrame) {
    onPageURLChange(tabId, url)
  }
}

// called whenever the page finishes loading
function onPageLoad (tabId) {
  // capture a preview image if a new page has been loaded
  if (tabId === tabs.getSelected()) {
    setTimeout(function () {
      // sometimes the page isn't visible until a short time after the did-finish-load event occurs
      captureCurrentTab()
    }, 100)
  }
}

function scrollOnLoad (tabId, scrollPosition) {
  const listener = function (eTabId) {
    if (eTabId === tabId) {
      // the scrollable content may not be available until some time after the load event, so attempt scrolling several times
      // but stop once we've successfully scrolled once so we don't overwrite user scroll attempts that happen later
      for (let i = 0; i < 3; i++) {
        var done = false
        setTimeout(function () {
          if (!done) {
            webviews.callAsync(tabId, 'executeJavaScript', `
            (function() {
              window.scrollTo(0, ${scrollPosition})
              return window.scrollY === ${scrollPosition}
            })()
            `, function (err, completed) {
              if (!err && completed) {
                done = true
              }
            })
          }
        }, 750 * i)
      }
      webviews.unbindEvent('did-finish-load', listener)
    }
  }
  webviews.bindEvent('did-finish-load', listener)
}

const webviews = {
  viewList: [], // [tabId]
  tabContentsMap: {}, // tabId: webContents
  viewFullscreenMap: {}, // tabId, isFullscreen
  selectedId: null,
  placeholderRequests: [],
  asyncCallbacks: {},
  internalPages: {
    error: urlParser.getFileURL(__dirname + '/pages/error/index.html')
  },
  events: [],
  IPCEvents: [],
  bindEvent: function (event, fn) {
    webviews.events.push({
      event: event,
      fn: fn
    })
  },
  unbindEvent: function (event, fn) {
    for (var i = 0; i < webviews.events.length; i++) {
      if (webviews.events[i].event === event && webviews.events[i].fn === fn) {
        webviews.events.splice(i, 1)
        i--
      }
    }
  },
  emitEvent: function (event, viewId, args) {
    if (!webviews.viewList.includes(viewId)) {
      // the view could have been destroyed between when the event was occured and when it was recieved in the UI process, see https://github.com/minbrowser/min/issues/604#issuecomment-419653437
      return
    }
    webviews.events.forEach(function (ev) {
      if (ev.event === event) {
        ev.fn.apply(this, [viewId].concat(args))
      }
    })
  },
  bindIPC: function (name, fn) {
    webviews.IPCEvents.push({
      name: name,
      fn: fn
    })
  },
  viewMargins: [0, 0, 0, 0], // top, right, bottom, left
  adjustMargin: function (margins) {
    for (var i = 0; i < margins.length; i++) {
      webviews.viewMargins[i] += margins[i]
    }
    webviews.resize()
  },
  getViewBounds: function () {
    if (webviews.viewFullscreenMap[webviews.selectedId]) {
      return {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight
      }
    } else {
      if (!hasSeparateTitlebar && (window.platformType === 'linux' || window.platformType === 'windows') && !windowIsMaximized && !windowIsFullscreen) {
        var navbarHeight = 48
      } else {
        var navbarHeight = 36
      }

      const viewMargins = webviews.viewMargins
      return {
        x: 0 + viewMargins[3],
        y: 0 + viewMargins[0] + navbarHeight,
        width: window.innerWidth - (viewMargins[1] + viewMargins[3]),
        height: window.innerHeight - (viewMargins[0] + viewMargins[2]) - navbarHeight
      }
    }
  },
  add: function (tabId) {
    var tabData = tabs.get(tabId)

    // needs to be called before the view is created to that its listeners can be registered
    if (tabData.scrollPosition) {
      scrollOnLoad(tabId, tabData.scrollPosition)
    }

    // if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
    // since tab IDs are unique, we can use them as partition names
    if (tabData.private === true) {
      var partition = tabId.toString() // options.tabId is a number, which remote.session.fromPartition won't accept. It must be converted to a string first
    }

    ipc.send('createView', {
      id: tabId,
      webPreferencesString: JSON.stringify({
        webPreferences: {
          nodeIntegration: false,
          nodeIntegrationInSubFrames: true,
          scrollBounce: true,
          safeDialogs: true,
          safeDialogsMessage: 'Prevent this page from creating additional dialogs',
          preload: __dirname + '/dist/preload.js',
          contextIsolation: true,
          sandbox: true,
          enableRemoteModule: false,
          allowPopups: false,
          partition: partition,
          enableWebSQL: false
        }
      }),
      boundsString: JSON.stringify(webviews.getViewBounds()),
      events: webviews.events.map(e => e.event).filter((i, idx, arr) => arr.indexOf(i) === idx)
    })

    let contents = lazyRemoteObject(function () {
      return getView(tabId).webContents
    })

    if (tabData.url) {
      ipc.send('loadURLInView', {id: tabData.id, url: urlParser.parse(tabData.url)})
    } else if (tabData.private) {
      // workaround for https://github.com/minbrowser/min/issues/872
      ipc.send('loadURLInView', {id: tabData.id, url: urlParser.parse('min://newtab')})
    }

    webviews.tabContentsMap[tabId] = contents
    webviews.viewList.push(tabId)
  },
  setSelected: function (id, options) { // options.focus - whether to focus the view. Defaults to true.
    webviews.emitEvent('view-hidden', webviews.selectedId)

    webviews.selectedId = id

    // create the view if it doesn't already exist
    if (!webviews.viewList.includes(id)) {
      webviews.add(id)
    }

    if (webviews.placeholderRequests.length > 0) {
      // update the placeholder instead of showing the actual view
      webviews.requestPlaceholder()
      return
    }

    ipc.send('setView', {
      id: id,
      bounds: webviews.getViewBounds(),
      focus: !options || options.focus !== false
    })
    webviews.emitEvent('view-shown', id)

    forceUpdateDragRegions()
  },
  update: function (id, url) {
    ipc.send('loadURLInView', {id: id, url: urlParser.parse(url)})
  },
  destroy: function (id) {
    webviews.emitEvent('view-hidden', id)

    if (webviews.viewList.includes(id)) {
      webviews.viewList.splice(webviews.viewList.indexOf(id), 1)
      ipc.send('destroyView', id)
    }
    delete webviews.tabContentsMap[id]
    delete webviews.viewFullscreenMap[id]
    if (webviews.selectedId === id) {
      webviews.selectedId = null
    }
  },
  get: function (id) {
    return webviews.tabContentsMap[id]
  },
  requestPlaceholder: function (reason) {
    if (reason && !webviews.placeholderRequests.includes(reason)) {
      webviews.placeholderRequests.push(reason)
    }
    if (webviews.placeholderRequests.length >= 1) {
      // create a new placeholder

      var img = previewCache.get(webviews.selectedId)
      var associatedTab = tabs.get(webviews.selectedId)
      if (img) {
        placeholderImg.src = img
        placeholderImg.hidden = false
      } else if (associatedTab && associatedTab.url) {
        captureCurrentTab({forceCapture: true})
      } else {
        placeholderImg.hidden = true
      }
    }
    setTimeout(function () {
      // wait to make sure the image is visible before the view is hidden
      // make sure the placeholder was not removed between when the timeout was created and when it occurs
      if (webviews.placeholderRequests.length > 0) {
        ipc.send('hideCurrentView')
        webviews.emitEvent('view-hidden', webviews.selectedId)
      }
    }, 0)
  },
  hidePlaceholder: function (reason) {
    if (webviews.placeholderRequests.includes(reason)) {
      webviews.placeholderRequests.splice(webviews.placeholderRequests.indexOf(reason), 1)
    }

    if (webviews.placeholderRequests.length === 0) {
      // multiple things can request a placeholder at the same time, but we should only show the view again if nothing requires a placeholder anymore
      if (webviews.viewList.includes(webviews.selectedId)) {
        ipc.send('setView', {
          id: webviews.selectedId,
          bounds: webviews.getViewBounds(),
          focus: true
        })
        webviews.emitEvent('view-shown', webviews.selectedId)
        forceUpdateDragRegions()
      }
      // wait for the view to be visible before removing the placeholder
      setTimeout(function () {
        if (webviews.placeholderRequests.length === 0) { // make sure the placeholder hasn't been re-enabled
          placeholderImg.hidden = true
        }
      }, 400)
    }
  },
  releaseFocus: function () {
    ipc.send('focusMainWebContents')
  },
  focus: function () {
    if (webviews.selectedId) {
      ipc.send('focusView', webviews.selectedId)
    }
  },
  resize: function () {
    ipc.send('setBounds', {id: webviews.selectedId, bounds: webviews.getViewBounds()})
  },
  goBackIgnoringRedirects: function (id) {
    // special case: the current page is an internal page representing a regular webpage, and the previous page in history is that page (which likely means a redirect happened from the original page to the internal page)
    // probably either an error page (after  a redirect from the original page) or reader view
    var url = tabs.get(id).url

    var isInternalURL = urlParser.isInternalURL(url)
    if (isInternalURL) {
      var representedURL = urlParser.getSourceURL(url)

      // TODO this uses internal Electron API's - figure out a way to do this with the public API
      webviews.callAsync(id, 'history', function (err, history) {
        webviews.callAsync(id, 'currentIndex', function (err, currentIndex) {
          var previous = history.slice(0, currentIndex + 1)
          if (previous.length > 2 && previous[previous.length - 2] === representedURL) {
            webviews.callAsync(id, 'goToOffset', -2)
          } else {
            webviews.callAsync(id, 'goBack')
          }
        })
      })
    } else {
      webviews.callAsync(id, 'goBack')
    }
  },
  /*
  Can be called as
  callAsync(id, method, args, callback) -> invokes method with args, runs callback with (err, result)
  callAsync(id, method, callback) -> invokes method with no args, runs callback with (err, result)
  callAsync(id, property, value, callback) -> sets property to value
  callAsync(id, property, callback) -> reads property, runs callback with (err, result)
   */
  callAsync: function (id, method, argsOrCallback, callback) {
    var args = argsOrCallback
    var cb = callback
    if (argsOrCallback instanceof Function && !cb) {
      args = []
      cb = argsOrCallback
    }
    if (!(args instanceof Array)) {
      args = [args]
    }
    if (cb) {
      var callId = Math.random()
      webviews.asyncCallbacks[callId] = cb
    }
    ipc.send('callViewMethod', {id: id, callId: callId, method: method, args: args})
  }
}

window.addEventListener('resize', throttle(function () {
  if (webviews.placeholderRequests.length > 0) {
    // can't set view bounds if the view is hidden
    return
  }
  webviews.resize()
}, 75))

// leave HTML fullscreen when leaving window fullscreen
ipc.on('leave-full-screen', function () {
  // electron normally does this automatically (https://github.com/electron/electron/pull/13090/files), but it doesn't work for BrowserViews
  for (var view in webviews.viewFullscreenMap) {
    if (webviews.viewFullscreenMap[view]) {
      webviews.callAsync(view, 'executeJavaScript', 'document.exitFullscreen()')
    }
  }
})

webviews.bindEvent('enter-html-full-screen', function (tabId) {
  webviews.viewFullscreenMap[tabId] = true
  webviews.resize()
})

webviews.bindEvent('leave-html-full-screen', function (tabId) {
  webviews.viewFullscreenMap[tabId] = false
  webviews.resize()
})

ipc.on('maximize', function () {
  windowIsMaximized = true
  webviews.resize()
})

ipc.on('unmaximize', function () {
  windowIsMaximized = false
  webviews.resize()
})

ipc.on('enter-full-screen', function () {
  windowIsFullscreen = true
  webviews.resize()
})

ipc.on('leave-full-screen', function () {
  windowIsFullscreen = false
  webviews.resize()
})

webviews.bindEvent('did-start-navigation', onNavigate)
webviews.bindEvent('will-redirect', onNavigate)
webviews.bindEvent('did-finish-load', onPageLoad)

webviews.bindEvent('page-title-updated', function (tabId, title, explicitSet) {
  tabs.update(tabId, {
    title: title
  })
})

webviews.bindEvent('did-fail-load', function (tabId, errorCode, errorDesc, validatedURL, isMainFrame) {
  if (errorCode && errorCode !== -3 && isMainFrame && validatedURL) {
    webviews.update(tabId, webviews.internalPages.error + '?ec=' + encodeURIComponent(errorCode) + '&url=' + encodeURIComponent(validatedURL))
  }
})

webviews.bindEvent('crashed', function (tabId, isKilled) {
  var url = tabs.get(tabId).url

  tabs.update(tabId, {
    url: webviews.internalPages.error + '?ec=crash&url=' + encodeURIComponent(url)
  })

  // the existing process has crashed, so we can't reuse it
  webviews.destroy(tabId)
  webviews.add(tabId)

  if (tabId === tabs.getSelected()) {
    webviews.setSelected(tabId)
  }
})

webviews.bindIPC('getSettingsData', function (tabId, args) {
  webviews.callAsync(tabId, 'send', ['receiveSettingsData', settings.list])
})
webviews.bindIPC('setSetting', function (tabId, args) {
  settings.set(args[0].key, args[0].value)
})

settings.listen(function () {
  tasks.forEach(function (task) {
    task.tabs.forEach(function (tab) {
      if (tab.url.startsWith('file://')) {
        try {
          webviews.callAsync(tab.id, 'send', ['receiveSettingsData', settings.list])
        } catch (e) {
          // webview might not actually exist
        }
      }
    })
  })
})

webviews.bindIPC('scroll-position-change', function (tabId, args) {
  tabs.update(tabId, {
    scrollPosition: args[0]
  })
})

ipc.on('view-event', function (e, args) {
  webviews.emitEvent(args.event, args.viewId, args.args)
})

ipc.on('async-call-result', function (e, args) {
  webviews.asyncCallbacks[args.callId](args.error, args.result)
  delete webviews.asyncCallbacks[args.callId]
})

ipc.on('view-ipc', function (e, args) {
  if (!webviews.viewList.includes(args.id)) {
    // the view could have been destroyed between when the event was occured and when it was recieved in the UI process, see https://github.com/minbrowser/min/issues/604#issuecomment-419653437
    return
  }
  webviews.IPCEvents.forEach(function (item) {
    if (item.name === args.name) {
      item.fn(args.id, [args.data], args.frameId)
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

ipc.on('windowFocus', function () {
  if (document.activeElement === document.body) {
    webviews.focus()
  }
})

module.exports = webviews
