var viewMap = {} // id: view
var viewStateMap = {} // id: view state

const BrowserView = electron.BrowserView

function createView (id, webPreferencesString, boundsString, events) {
  let view = new BrowserView(JSON.parse(webPreferencesString))

  events.forEach(function (ev) {
    view.webContents.on(ev.event, function (e) {
      if (ev.options && ev.options.preventDefault) {
        e.preventDefault()
      }
      mainWindow.webContents.send('view-event', {
        viewId: id,
        eventId: ev.id,
        args: Array.prototype.slice.call(arguments).slice(1)
      })
    })
  })

  view.webContents.on('ipc-message', function (e, channel, data) {
    mainWindow.webContents.send('view-ipc', {
      id: id,
      name: channel,
      data: data
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
  if (viewMap[id].webContents.getURL() !== '' || viewMap[id].webContents.isLoading()) {
    viewMap[id].webContents.focus()
  } else {
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
    result = webContents[data.method].apply(webContents, data.args)
  } catch (e) {
    error = e
  }
  if (data.callId) {
    mainWindow.webContents.send('async-call-result', {callId: data.callId, error, result})
  }
})

ipc.on('getCapture', function (e, data) {
  viewMap[data.id].webContents.capturePage().then(function (img) {
    var size = img.getSize()
    if (size.width === 0 && size.height === 0) {
      return
    }
    img = img.resize({width: data.width, height: data.height})
    mainWindow.webContents.send('captureData', {id: data.id, url: img.toDataURL()})
  })
})

global.getView = getView
