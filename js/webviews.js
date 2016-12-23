/* implements selecting webviews, switching between them, and creating new ones. */

var phishingWarningPage = 'file://' + __dirname + '/pages/phishing/index.html' // TODO move this somewhere that actually makes sense
var crashedWebviewPage = 'file:///' + __dirname + '/pages/crash/index.html'
var errorPage = 'file:///' + __dirname + '/pages/error/index.html'

var webviewBase = document.getElementById('webviews')
var webviewEvents = []
var webviewIPC = []

// this only affects newly created webviews, so all bindings should be done on startup

function bindWebviewEvent (event, fn) {
  webviewEvents.push({
    event: event,
    fn: fn
  })
}

// function is called with (webview, tabId, IPCArguements)

function bindWebviewIPC (name, fn) {
  webviewIPC.push({
    name: name,
    fn: fn
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

// called whenever the page url changes

function onPageLoad (e) {
  var tab = this.getAttribute('data-tab')
  var url = this.getAttribute('src') // src attribute changes whenever a page is loaded

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

  rerenderTabElement(tab)
}

// called when js/webview/textExtractor.js returns the page's text content
bindWebviewIPC('pageData', function (webview, tabId, arguments) {
  var tab = tabs.get(tabId),
      data = arguments[0]

  var isInternalPage = tab.url.indexOf(__dirname) !== -1 && tab.url.indexOf(readerView.readerURL) === -1

  // don't save to history if in private mode, or the page is a browser page
  if (tab.private === false && !isInternalPage) {
    bookmarks.updateHistory(tabId, data.extractedText, data.metadata)
  }
})

// set the permissionRequestHandler for non-private tabs

remote.session.defaultSession.setPermissionRequestHandler(pagePermissionRequestHandler)

function getWebviewDom (options) {
  var w = document.createElement('webview')
  w.setAttribute('preload', 'dist/webview.min.js')

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

  webviewEvents.forEach(function (i) {
    w.addEventListener(i.event, i.fn)
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
    rerenderTabElement(tab)
  })

  w.addEventListener('did-finish-load', onPageLoad)
  w.addEventListener('did-navigate-in-page', onPageLoad)

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

    webviewIPC.forEach(function (item) {
      if (item.name === e.channel) {
        item.fn(w, tab, e.args)
      }
    })

    if (e.channel === 'phishingDetected') {
      // check if the page is on the phishing detection whitelist

      var url = w.getAttribute('src')

      try {
        var hostname = new URL(url).hostname
        var redirectURL = phishingWarningPage + '?url=' + encodeURIComponent(url) + '&info=' + encodeURIComponent(e.args[0].join('\n'))
      } catch (e) {
        var hostname = ''
        var redirectURL = phishingWarningPage
      }

      settings.get('phishingWhitelist', function (value) {
        if (!value || !hostname || value.indexOf(hostname) === -1) {
          // show the warning page
          navigate(tab, redirectURL)
        }
      }, {
        fromCache: false
      })
    }
  })

  w.addEventListener('contextmenu', webviewMenu.show)

  w.addEventListener('crashed', function (e) {
    var tabId = this.getAttribute('data-tab')

    destroyWebview(tabId)
    tabs.update(tabId, {
      url: crashedWebviewPage
    })

    addWebview(tabId)
    switchToWebview(tabId)
  })

  w.addEventListener('did-fail-load', function (e) {
    if (e.errorCode !== -3 && e.validatedURL === e.target.getURL()) {
      navigate(this.getAttribute('data-tab'), errorPage + '?ec=' + encodeURIComponent(e.errorCode) + '&url=' + encodeURIComponent(e.target.getURL()))
    }
  })

  w.addEventListener('enter-html-full-screen', function (e) {
    this.classList.add('fullscreen')
  })

  w.addEventListener('leave-html-full-screen', function (e) {
    this.classList.remove('fullscreen')
  })

  return w
}

/* options: openInBackground: should the webview be opened without switching to it? default is false. */

function addWebview (tabId) {
  var tabData = tabs.get(tabId)

  var webview = getWebviewDom({
    tabId: tabId,
    url: tabData.url
  })

  // this is used to hide the webview while still letting it load in the background
  // webviews are hidden when added - call switchToWebview to show it
  webview.classList.add('hidden')

  webviewBase.appendChild(webview)

  return webview
}

function switchToWebview (id) {
  var webviews = document.getElementsByTagName('webview')
  for (var i = 0; i < webviews.length; i++) {
    webviews[i].hidden = true
  }

  var wv = getWebview(id)

  if (!wv) {
    wv = addWebview(id)
  }

  wv.classList.remove('hidden')
  wv.hidden = false
}

function updateWebview (id, url) {
  getWebview(id).setAttribute('src', urlParser.parse(url))
}

function destroyWebview (id) {
  var w = document.querySelector('webview[data-tab="{id}"]'.replace('{id}', id))
  if (w) {
    w.parentNode.removeChild(w)
  }
}

function getWebview (id) {
  return document.querySelector('webview[data-tab="{id}"]'.replace('{id}', id))
}
