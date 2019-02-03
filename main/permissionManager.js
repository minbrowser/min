function pagePermissionRequestHandler (webContents, permission, callback) {
  if (permission === 'notifications' || permission === 'fullscreen') {
    callback(true)
  } else {
    callback(false)
  }
}

function pagePermissionCheckHandler (webContents, permission, requestingOrigin, details) {
  return false
}

app.once('ready', function () {
  session.defaultSession.setPermissionRequestHandler(pagePermissionRequestHandler)
  session.defaultSession.setPermissionCheckHandler(pagePermissionCheckHandler)
})

app.on('session-created', function (session) {
  session.setPermissionRequestHandler(pagePermissionRequestHandler)
  session.setPermissionCheckHandler(pagePermissionCheckHandler)
})
