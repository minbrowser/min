var viewMap = {} // id: view
var viewStateMap = {} // id: view state

const BrowserView = electron.BrowserView

function createView (id, webPreferencesString, boundsString, events) {
  let view = new BrowserView(JSON.parse(webPreferencesString))

  events.forEach(function (event) {
    view.webContents.on(event, function (e) {
      /*
      new-window is special in two ways:
      * its arguments contain a webContents object that can't be serialized and needs to be removed.
      * If it is being handled by the UI process, preventDefault() needs to be called in order not to create a new window.
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
    if (authInfo.scheme !== 'basic') {  // Only for basic auth
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

  view.setBounds(JSON.parse(boundsString))

  viewMap[id] = view
  viewStateMap[id] = {loadedInitialURL: false}

  return view
}

function destroyView (id) {
  // destroy an associated partition

  var partition = viewMap[id].webContents.getWebPreferences().partition
  if (partition) {
    session.fromPartition(partition).destroy()
  }
  if (viewMap[id] === mainWindow.getBrowserView()) {
    mainWindow.setBrowserView(null)
  }
  viewMap[id].destroy()
  delete viewMap[id]
  delete viewStateMap[id]
}

function destroyAllViews () {
  for (let id in viewMap) {
    destroyView(id)
  }
}

function setView (id) {
  mainWindow.setBrowserView(viewMap[id])
}

function setBounds (id, bounds) {
  viewMap[id].setBounds(bounds)
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
        mainWindow.webContents.send('async-call-result', {callId: data.callId, error: null, result})
      }
    })
    result.catch(function (error) {
      if (data.callId) {
        mainWindow.webContents.send('async-call-result', {callId: data.callId, error, result: null})
      }
    })
  } else if (data.callId) {
    mainWindow.webContents.send('async-call-result', {callId: data.callId, error, result})
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
    img = img.resize({width: data.width, height: data.height})
    mainWindow.webContents.send('captureData', {id: data.id, url: img.toDataURL()})
  })
})

global.getView = getView
