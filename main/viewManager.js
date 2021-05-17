var viewMap = {} // id: view
var viewStateMap = {} // id: view state

const BrowserView = electron.BrowserView

function createView (id, webPreferencesString, boundsString, events) {
  const view = new BrowserView(JSON.parse(webPreferencesString))

  events.forEach(function (event) {
    view.webContents.on(event, function (e) {
      /*
      new-window is special because its arguments contain a webContents object that can't be serialized and needs to be removed.
      */
      var args = Array.prototype.slice.call(arguments).slice(1)
      if (event === 'new-window') {
        e.preventDefault()
        args = args.slice(0, 3)
      }

      mainWindow.webContents.send('view-event', {
        viewId: id,
        event: event,
        args: args
      })
    })
  })

  /*
  Workaround for crashes when calling preventDefault() on the new-window event (https://github.com/electron/electron/issues/23859#issuecomment-650270680)
  Calling preventDefault also prevents the new-window event from occurring, so create a new event here instead
  */
  view.webContents.on('-will-add-new-contents', function (e, url) {
    e.preventDefault()
    mainWindow.webContents.send('view-event', {
      viewId: id,
      event: 'new-window',
      args: [url, '', 'new-window']
    })
  })

  view.webContents.on('ipc-message', function (e, channel, data) {
    mainWindow.webContents.send('view-ipc', {
      id: id,
      name: channel,
      data: data,
      frameId: e.frameId
    })
  })

  // Open a login prompt when site asks for http authentication
  view.webContents.on('login', (event, authenticationResponseDetails, authInfo, callback) => {
    if (authInfo.scheme !== 'basic') { // Only for basic auth
      return
    }
    event.preventDefault()
    var title = l('loginPromptTitle').replace('%h', authInfo.host).replace('%r', authInfo.realm)
    createPrompt({
      text: title,
      values: [{ placeholder: l('username'), id: 'username', type: 'text' },
        { placeholder: l('password'), id: 'password', type: 'password' }],
      ok: l('dialogConfirmButton'),
      cancel: l('dialogSkipButton'),
      width: 400,
      height: 200
    }, function (result) {
      // resend request with auth credentials
      callback(result.username, result.password)
    })
  })

  // show an "open in app" prompt for external protocols

  function handleExternalProtocol (e, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) {
    var knownProtocols = ['http', 'https', 'file', 'min', 'about', 'data', 'javascript', 'chrome'] // TODO anything else?
    if (!knownProtocols.includes(url.split(':')[0])) {
      var externalApp = app.getApplicationNameForProtocol(url)
      if (externalApp) {
        // TODO find a better way to do this
        // (the reason to use executeJS instead of the Electron dialog API is so we get the "prevent this page from creating additional dialogs" checkbox)
        var sanitizedName = externalApp.replace(/[^a-zA-Z0-9.]/g, '')
        if (view.webContents.getURL()) {
          view.webContents.executeJavaScript('confirm("' + l('openExternalApp').replace('%s', sanitizedName) + '")').then(function (result) {
            if (result === true) {
              electron.shell.openExternal(url)
            }
          })
        } else {
          // the code above tries to show the dialog in a browserview, but if the view has no URL, this won't work.
          // so show the dialog globally as a fallback
          var result = electron.dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['OK', 'Cancel'],
            message: l('openExternalApp').replace('%s', sanitizedName).replace(/\\/g, '')
          })

          if (result === 0) {
            electron.shell.openExternal(url)
          }
        }
      }
    }
  }

  view.webContents.on('did-start-navigation', handleExternalProtocol)
  /*
  It's possible for an HTTP request to redirect to an external app link
  (primary use case for this is OAuth from desktop app > browser > back to app)
  and did-start-navigation isn't (always?) emitted for redirects, so we need this handler as well
  */
  view.webContents.on('will-redirect', handleExternalProtocol)

  view.setBounds(JSON.parse(boundsString))

  viewMap[id] = view
  viewStateMap[id] = { loadedInitialURL: false }

  return view
}

function destroyView (id) {
  if (!viewMap[id]) {
    return
  }

  if (viewMap[id] === mainWindow.getBrowserView()) {
    mainWindow.setBrowserView(null)
  }
  viewMap[id].webContents.destroy()

  delete viewMap[id]
  delete viewStateMap[id]
}

function destroyAllViews () {
  for (const id in viewMap) {
    destroyView(id)
  }
}

function setView (id) {
  mainWindow.setBrowserView(viewMap[id])
}

function setBounds (id, bounds) {
  if (viewMap[id]) {
    viewMap[id].setBounds(bounds)
  }
}

function focusView (id) {
  // empty views can't be focused because they won't propogate keyboard events correctly, see https://github.com/minbrowser/min/issues/616
  // also, make sure the view exists, since it might not if the app is shutting down
  if (viewMap[id] && (viewMap[id].webContents.getURL() !== '' || viewMap[id].webContents.isLoading())) {
    viewMap[id].webContents.focus()
  } else if (mainWindow) {
    mainWindow.webContents.focus()
  }
}

function hideCurrentView () {
  mainWindow.setBrowserView(null)
  mainWindow.webContents.focus()
}

function getView (id) {
  return viewMap[id]
}

function getViewIDFromWebContents (contents) {
  for (var id in viewMap) {
    if (viewMap[id].webContents === contents) {
      return id
    }
  }
}

ipc.on('createView', function (e, args) {
  createView(args.id, args.webPreferencesString, args.boundsString, args.events)
})

ipc.on('destroyView', function (e, id) {
  destroyView(id)
})

ipc.on('destroyAllViews', function () {
  destroyAllViews()
})

ipc.on('setView', function (e, args) {
  setView(args.id)
  setBounds(args.id, args.bounds)
  if (args.focus) {
    focusView(args.id)
  }
})

ipc.on('setBounds', function (e, args) {
  setBounds(args.id, args.bounds)
})

ipc.on('focusView', function (e, id) {
  focusView(id)
})

ipc.on('hideCurrentView', function (e) {
  hideCurrentView()
})

ipc.on('loadURLInView', function (e, args) {
  // wait until the first URL is loaded to set the background color so that new tabs can use a custom background
  if (!viewStateMap[args.id].loadedInitialURL) {
    viewMap[args.id].setBackgroundColor('#fff')
  }
  viewMap[args.id].webContents.loadURL(args.url)
  viewStateMap[args.id].loadedInitialURL = true
})

ipc.on('callViewMethod', function (e, data) {
  var error, result
  try {
    var webContents = viewMap[data.id].webContents
    var methodOrProp = webContents[data.method]
    if (methodOrProp instanceof Function) {
      // call function
      result = methodOrProp.apply(webContents, data.args)
    } else {
      // set property
      if (data.args && data.args.length > 0) {
        webContents[data.method] = data.args[0]
      }
      // read property
      result = methodOrProp
    }
  } catch (e) {
    error = e
  }
  if (result instanceof Promise) {
    result.then(function (result) {
      if (data.callId) {
        mainWindow.webContents.send('async-call-result', { callId: data.callId, error: null, result })
      }
    })
    result.catch(function (error) {
      if (data.callId) {
        mainWindow.webContents.send('async-call-result', { callId: data.callId, error, result: null })
      }
    })
  } else if (data.callId) {
    mainWindow.webContents.send('async-call-result', { callId: data.callId, error, result })
  }
})

ipc.on('getCapture', function (e, data) {
  var view = viewMap[data.id]
  if (!view) {
    // view could have been destroyed
    return
  }

  view.webContents.capturePage().then(function (img) {
    var size = img.getSize()
    if (size.width === 0 && size.height === 0) {
      return
    }
    img = img.resize({ width: data.width, height: data.height })
    mainWindow.webContents.send('captureData', { id: data.id, url: img.toDataURL() })
  })
})

ipc.on('saveViewCapture', function (e, data) {
  var view = viewMap[data.id]
  if (!view) {
    // view could have been destroyed
  }

  view.webContents.capturePage().then(function (image) {
    view.webContents.downloadURL(image.toDataURL())
  })
})

global.getView = getView
