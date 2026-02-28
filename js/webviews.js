var urlParser = require('util/urlParser.js')
var settings = require('util/settings/settings.js')

/* implements selecting webviews, switching between them, and creating new ones. */

var placeholderImg = document.getElementById('webview-placeholder')

var hasSeparateTitlebar = settings.get('useSeparateTitlebar')
var windowIsMaximized = false // affects navbar height on Windows
var windowIsFullscreen = false
var multiViewMaxViews = 3
var tabHibernationTimeoutMinutes = 30


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
  if (url.indexOf('https://') === 0 || url.indexOf('about:') === 0 || url.indexOf('chrome:') === 0 || url.indexOf('file://') === 0 || url.indexOf('min://') === 0) {
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

  webviews.callAsync(tab, 'setVisualZoomLevelLimits', [1, 3])
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
    }, 250)
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

function setAudioMutedOnCreate (tabId, muted) {
  const listener = function () {
    webviews.callAsync(tabId, 'setAudioMuted', muted)
    webviews.unbindEvent('did-navigate', listener)
  }
  webviews.bindEvent('did-navigate', listener)
}

const webviews = {
  viewFullscreenMap: {}, // tabId, isFullscreen
  selectedId: null,
  selectedIds: [],
  placeholderRequests: [],
  asyncCallbacks: {},
  internalPages: {
    error: 'min://app/pages/error/index.html'
  },
  events: [],
  IPCEvents: [],
  hasViewForTab: function(tabId) {
    return tabId && tasks.getTaskContainingTab(tabId) && tasks.getTaskContainingTab(tabId).tabs.get(tabId).hasWebContents
  },
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
  emitEvent: function (event, tabId, args) {
    if (!webviews.hasViewForTab(tabId)) {
      // the view could have been destroyed between when the event was occured and when it was recieved in the UI process, see https://github.com/minbrowser/min/issues/604#issuecomment-419653437
      return
    }
    webviews.events.forEach(function (ev) {
      if (ev.event === event) {
        ev.fn.apply(this, [tabId].concat(args))
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

      let position = {
        x: 0 + Math.round(viewMargins[3]),
        y: 0 + Math.round(viewMargins[0]) + navbarHeight,
        width: window.innerWidth - Math.round(viewMargins[1] + viewMargins[3]),
        height: window.innerHeight - Math.round(viewMargins[0] + viewMargins[2]) - navbarHeight
      }

      return position
    }
  },
  getActiveTabIds: function () {
    const ids = webviews.selectedIds.filter(id => id && webviews.hasViewForTab(id))
    if (ids.length === 0 && webviews.selectedId && webviews.hasViewForTab(webviews.selectedId)) {
      ids.push(webviews.selectedId)
    }
    return ids
  },
  getViewBoundsForLayout: function (index, total) {
    const base = webviews.getViewBounds()
    if (total <= 1) {
      return base
    }

    if (total === 2) {
      const width = Math.floor(base.width / 2)
      return {
        x: base.x + (index * width),
        y: base.y,
        width: (index === total - 1 ? base.width - width : width),
        height: base.height
      }
    }

    const topHeight = Math.floor(base.height * 0.58)
    if (index === 0) {
      return {
        x: base.x,
        y: base.y,
        width: base.width,
        height: topHeight
      }
    }

    const bottomCount = total - 1
    const bottomWidth = Math.floor(base.width / bottomCount)
    const bottomIndex = index - 1
    return {
      x: base.x + (bottomIndex * bottomWidth),
      y: base.y + topHeight,
      width: (bottomIndex === bottomCount - 1 ? base.width - (bottomWidth * bottomIndex) : bottomWidth),
      height: base.height - topHeight
    }
  },
  applyLayout: function (options = {}) {
    const ids = webviews.getActiveTabIds()
    webviews.selectedIds = ids.slice(0, multiViewMaxViews)

    if (webviews.selectedIds.length <= 1) {
      if (webviews.selectedIds[0]) {
        webviews.selectedId = webviews.selectedIds[0]
      }
      if (webviews.selectedId) {
        ipc.send('setView', {
          id: webviews.selectedId,
          bounds: webviews.getViewBounds(),
          focus: options.focus !== false
        })
      }
      return
    }

    const bounds = webviews.selectedIds.map(function (id, index) {
      return webviews.getViewBoundsForLayout(index, webviews.selectedIds.length)
    })

    ipc.send('setViews', {
      ids: webviews.selectedIds,
      bounds,
      focus: options.focus !== false
    })
  },
  setLayoutTabs: function (ids) {
    const sanitizedIds = (ids || []).filter(id => id && webviews.hasViewForTab(id))
    if (sanitizedIds.length === 0) {
      sanitizedIds.push(webviews.selectedId)
    }
    webviews.selectedIds = sanitizedIds.slice(0, multiViewMaxViews)
    if (webviews.selectedIds[0]) {
      webviews.selectedId = webviews.selectedIds[0]
    }
    webviews.applyLayout({ focus: true })
  },
  removeFromLayout: function (id) {
    if (!id) {
      return
    }
    webviews.selectedIds = webviews.selectedIds.filter(item => item !== id)
    if (webviews.selectedIds.length === 0 && webviews.selectedId && webviews.selectedId !== id) {
      webviews.selectedIds = [webviews.selectedId]
    }
  },
  toggleComparisonView: function (primaryId, secondaryId) {
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return
    }
    if (!webviews.hasViewForTab(primaryId) || !webviews.hasViewForTab(secondaryId)) {
      return
    }

    const hasSecondary = webviews.selectedIds.includes(secondaryId)
    if (hasSecondary) {
      webviews.setLayoutTabs([primaryId])
    } else {
      webviews.setLayoutTabs([primaryId, secondaryId])
    }
  },
  add: function (tabId, existingViewId) {
    var tabData = tabs.get(tabId)

    // needs to be called before the view is created to that its listeners can be registered
    if (tabData.scrollPosition) {
      scrollOnLoad(tabId, tabData.scrollPosition)
    }

    if (tabData.muted) {
      setAudioMutedOnCreate(tabId, tabData.muted)
    }

    // if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
    // since tab IDs are unique, we can use them as partition names
    if (tabData.private === true) {
      var partition = tabId.toString() // options.tabId is a number, which remote.session.fromPartition won't accept. It must be converted to a string first
    }

    ipc.send('createView', {
      existingViewId,
      id: tabId,
      webPreferences: {
        partition: partition || 'persist:webcontent'
      },
      boundsString: JSON.stringify(webviews.getViewBounds()),
      events: webviews.events.map(e => e.event).filter((i, idx, arr) => arr.indexOf(i) === idx)
    })

    if (!existingViewId) {
      if (tabData.url) {
        ipc.send('loadURLInView', { id: tabData.id, url: urlParser.parse(tabData.url) })
      } else if (tabData.private) {
        // workaround for https://github.com/minbrowser/min/issues/872
        ipc.send('loadURLInView', { id: tabData.id, url: urlParser.parse('min://newtab') })
      }
    }

    tasks.getTaskContainingTab(tabId).tabs.update(tabId, {
      hasWebContents: true
    })
  },
  setSelected: function (id, options) { // options.focus - whether to focus the view. Defaults to true.
    webviews.emitEvent('view-hidden', webviews.selectedId)

    webviews.selectedId = id

    const selectedTabData = tabs.get(id)
    if (selectedTabData && selectedTabData.hibernated) {
      webviews.wake(id)
    }

    // create the view if it doesn't already exist
    if (!webviews.hasViewForTab(id)) {
      webviews.add(id)
    }

    if (webviews.placeholderRequests.length > 0) {
      // update the placeholder instead of showing the actual view
      webviews.requestPlaceholder()
      return
    }

    if (!webviews.selectedIds.includes(id)) {
      webviews.selectedIds = [id]
    }

    webviews.applyLayout({ focus: !options || options.focus !== false })
    webviews.emitEvent('view-shown', id)
  },
  setHibernated: function (id, shouldHibernate) {
    if (!tabs.has(id)) {
      return
    }

    const tabData = tabs.get(id)
    if (!tabData || tabData.hibernated === shouldHibernate) {
      return
    }

    tabs.update(id, { hibernated: shouldHibernate })
  },
  hibernate: function (id) {
    if (!id || id === tabs.getSelected() || !webviews.hasViewForTab(id)) {
      return
    }

    webviews.setHibernated(id, true)
    webviews.destroy(id)
  },
  wake: function (id) {
    if (!tabs.has(id)) {
      return
    }

    const tabData = tabs.get(id)
    if (!tabData || !tabData.hibernated) {
      return
    }

    webviews.setHibernated(id, false)
    if (!webviews.hasViewForTab(id)) {
      webviews.add(id)
    }
  },
  update: function (id, url) {
    ipc.send('loadURLInView', { id: id, url: urlParser.parse(url) })
  },
  destroy: function (id) {
    webviews.emitEvent('view-hidden', id)

    if (webviews.hasViewForTab(id)) {
      tasks.getTaskContainingTab(id).tabs.update(id, {
        hasWebContents: false
      })
    }
    //we may be destroying a view for which the tab object no longer exists, so this message should be sent unconditionally
    ipc.send('destroyView', id)

    delete webviews.viewFullscreenMap[id]
    webviews.removeFromLayout(id)
    if (webviews.selectedId === id) {
      webviews.selectedId = webviews.selectedIds[0] || null
    }
  },
  requestPlaceholder: function (reason) {
    if (reason && !webviews.placeholderRequests.includes(reason)) {
      webviews.placeholderRequests.push(reason)
    }
    if (webviews.placeholderRequests.length >= 1) {
      // create a new placeholder

      var associatedTab = tasks.getTaskContainingTab(webviews.selectedId).tabs.get(webviews.selectedId)
      var img = associatedTab.previewImage
      if (img) {
        placeholderImg.src = img
        placeholderImg.hidden = false
      } else if (associatedTab && associatedTab.url) {
        captureCurrentTab({ forceCapture: true })
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
      if (webviews.hasViewForTab(webviews.selectedId)) {
        webviews.applyLayout({ focus: true })
        webviews.emitEvent('view-shown', webviews.selectedId)
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
    if (webviews.placeholderRequests.length > 0) {
      return
    }
    webviews.applyLayout({ focus: false })
  },
  goBackIgnoringRedirects: async function (id) {
    const navHistory = await webviews.getNavigationHistory(id)
    // If the current page is an internal page resulting from a redirect (error pages or reader mode), go back two pages

    var url = navHistory.entries[navHistory.activeIndex].url

    if (urlParser.isInternalURL(url) && navHistory.activeIndex > 1 && navHistory.entries[navHistory.activeIndex - 1].url === urlParser.getSourceURL(url)) {
      webviews.callAsync(id, 'canGoToOffset', -2, function (err, result) {
        if (!err && result === true) {
          webviews.callAsync(id, 'goToOffset', -2)
        } else {
          webviews.callAsync(id, 'goBack')
        }
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
    ipc.send('callViewMethod', { id: id, callId: callId, method: method, args: args })
  },
  getNavigationHistory: function (id) {
    return ipc.invoke('getNavigationHistory', id)
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
webviews.bindEvent('did-navigate', function (tabId, url, httpResponseCode, httpStatusText) {
  onPageURLChange(tabId, url)
})

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
  if (!urlParser.isInternalURL(tabs.get(tabId).url)) {
    throw new Error()
  }
  webviews.callAsync(tabId, 'send', ['receiveSettingsData', settings.list])
})
webviews.bindIPC('setSetting', function (tabId, args) {
  if (!urlParser.isInternalURL(tabs.get(tabId).url)) {
    throw new Error()
  }
  settings.set(args[0].key, args[0].value)
})

settings.listen(function () {
  tasks.forEach(function (task) {
    task.tabs.forEach(function (tab) {
      if (tab.url.startsWith('min://')) {
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

webviews.bindIPC('downloadFile', function (tabId, args) {
  if (tabs.get(tabId).url.startsWith('min://')) {
    webviews.callAsync(tabId, 'downloadURL', [args[0]])
  }
})

webviews.bindIPC('toggle-multi-view', function (tabId, args) {
  if (!urlParser.isInternalURL(tabs.get(tabId).url)) {
    throw new Error()
  }

  const targetTabId = args[0] && args[0].tabId
  webviews.toggleComparisonView(tabs.getSelected(), targetTabId)
})

settings.listen('multiViewMaxViews', function (value) {
  const parsed = parseInt(value)
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 3) {
    multiViewMaxViews = parsed
    webviews.selectedIds = webviews.selectedIds.slice(0, multiViewMaxViews)
    if (webviews.selectedIds.length === 0 && webviews.selectedId) {
      webviews.selectedIds = [webviews.selectedId]
    }
    webviews.applyLayout({ focus: false })
  }
})

ipc.on('view-event', function (e, args) {
  webviews.emitEvent(args.event, args.tabId, args.args)
})

ipc.on('async-call-result', function (e, args) {
  if (webviews.asyncCallbacks[args.callId]) {
    webviews.asyncCallbacks[args.callId](args.error, args.result)
    delete webviews.asyncCallbacks[args.callId]
  }
})

ipc.on('view-ipc', function (e, args) {
  if (!webviews.hasViewForTab(args.id)) {
    // the view could have been destroyed between when the event was occured and when it was recieved in the UI process, see https://github.com/minbrowser/min/issues/604#issuecomment-419653437
    return
  }
  webviews.IPCEvents.forEach(function (item) {
    if (item.name === args.name) {
      item.fn(args.id, [args.data], args.frameId, args.frameURL)
    }
  })
})

setInterval(function () {
  captureCurrentTab()
}, 15000)

ipc.on('captureData', function (e, data) {
  tabs.update(data.id, { previewImage: data.url })
  if (data.id === webviews.selectedId && webviews.placeholderRequests.length > 0) {
    placeholderImg.src = data.url
    placeholderImg.hidden = false
  }
})

/* focus the view when the window is focused */

ipc.on('windowFocus', function () {
  if (webviews.placeholderRequests.length === 0 && document.activeElement.tagName !== 'INPUT') {
    webviews.focus()
  }
})



settings.listen('tabHibernationTimeoutMinutes', function (value) {
  const parsed = parseInt(value)
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 240) {
    tabHibernationTimeoutMinutes = parsed
  } else {
    tabHibernationTimeoutMinutes = 30
  }
})

setInterval(function () {
  const selectedTab = tabs.getSelected()
  const now = Date.now()

  tasks.forEach(function (task) {
    task.tabs.forEach(function (tab) {
      if (tab.id === selectedTab || tab.private || !tab.url || !tab.hasWebContents || tab.hibernated) {
        return
      }

      const inactiveFor = now - (tab.lastActivity || now)
      if (inactiveFor >= tabHibernationTimeoutMinutes * 60 * 1000) {
        webviews.hibernate(tab.id)
      }
    })
  })
}, 60 * 1000)

module.exports = webviews
