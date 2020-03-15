var pendingPermissions = []
var grantedPermissions = []
var nextPermissionId = 1

/*
All permission requests are given to the renderer on each change,
it will figure out what updates to make
*/
function sendPermissionsToRenderer () {
  // remove properties that can't be serialized over IPC
  sendIPCToWindow(mainWindow, 'updatePermissions', pendingPermissions.concat(grantedPermissions).map(p => {
    return {
      permissionId: p.permissionId,
      tabId: p.tabId,
      permission: p.permission,
      details: p.details,
      granted: p.granted
    }
  }))
}

function removePermissionsForContents (contents) {
  pendingPermissions = pendingPermissions.filter(perm => perm.contents !== contents)
  grantedPermissions = grantedPermissions.filter(perm => perm.contents !== contents)

  sendPermissionsToRenderer()
}

/*
Was permission already granted for this tab and URL?
*/
function isPermissionGrantedForContents (requestContents, requestPermission, requestDetails) {
  var requestOrigin = new URL(requestDetails.requestingUrl).hostname

  for (var i = 0; i < grantedPermissions.length; i++) {
    var grantedOrigin = new URL(grantedPermissions[i].details.requestingUrl).hostname

    if (requestContents === grantedPermissions[i].contents && requestOrigin === grantedOrigin) {
      if (requestPermission === 'notifications' && grantedPermissions[i].permission === 'notifications') {
        return true
      }

      if (requestPermission === 'media' && grantedPermissions[i].permission === 'media') {
        // type 1: from permissionCheckHandler
        // request has a single media type
        if (requestDetails.mediaType && grantedPermissions[i].details.mediaTypes.includes(requestDetails.mediaType)) {
          return true
        }
        // type 2: from a permissionRequestHandler
        // request has multiple media types
        // TODO existing granted permissions should be merged together (i.e. if there is an existing permission for audio, and another for video, a new request for audio+video should be approved, but it currently won't be)
        if (requestDetails.mediaTypes && requestDetails.mediaTypes.every(type => grantedPermissions[i].details.mediaTypes.includes(type))) {
          return true
        }
      }
    }
  }
  return false
}

/*
Is there already a pending request of the given type for this tab+url?
 */
function hasPendingRequestForContents (contents, permission, details) {
  var requestOrigin = new URL(details.requestingUrl).hostname

  for (var i = 0; i < pendingPermissions.length; i++) {
    var pendingOrigin = new URL(pendingPermissions[i].details.requestingUrl).hostname

    if (contents === pendingPermissions[i].contents && requestOrigin === pendingOrigin && permission === pendingPermissions[i].permission) {
      return true
    }
  }
  return false
}

function pagePermissionRequestHandler (webContents, permission, callback, details) {
  if (!details.isMainFrame) {
    // not supported for now to simplify the UI
    callback(false)
    return
  }

  if (permission === 'fullscreen') {
    callback(true)
    return
  }

  /*
  Geolocation requires a Google API key (https://www.electronjs.org/docs/api/environment-variables#google_api_key), so it is disabled.
  Other permissions aren't supported for now to simplify the UI
  */
  if (['media', 'notifications'].includes(permission)) {
    /*
    If permission was previously granted for this page, new requests should be allowed
    */
    if (isPermissionGrantedForContents(webContents, permission, details)) {
      callback(true)
    } else if (permission === 'notifications' && hasPendingRequestForContents(webContents, permission, details)) {
      /*
      Sites sometimes make a new request for each notification, which can generate multiple requests if the first one wasn't approved.
      TODO this isn't entirely correct (some requests will be rejected when they should be pending) - correct solution is to show a single button to approve all requests in the UI.
      */
      callback(false)
    } else {
      pendingPermissions.push({
        permissionId: nextPermissionId,
        tabId: getViewIDFromWebContents(webContents),
        contents: webContents,
        permission: permission,
        details: details,
        callback: callback
      })

      sendPermissionsToRenderer()

      nextPermissionId++
    }

    /*
    Once this view is closed or navigated to a new page, these permissions should be revoked
    */
    webContents.on('did-start-navigation', function (e, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) {
      if (isMainFrame && !isInPlace) {
        removePermissionsForContents(webContents)
      }
    })
    webContents.once('destroyed', function () {
      // check whether the app is shutting down to avoid an electron crash (TODO remove this)
      if (mainWindow) {
        removePermissionsForContents(webContents)
      }
    })
  } else {
    callback(false)
  }
}

function pagePermissionCheckHandler (webContents, permission, requestingOrigin, details) {
  if (!details.isMainFrame) {
    return false
  }

  return isPermissionGrantedForContents(webContents, permission, details)
}

app.once('ready', function () {
  session.defaultSession.setPermissionRequestHandler(pagePermissionRequestHandler)
  session.defaultSession.setPermissionCheckHandler(pagePermissionCheckHandler)
})

app.on('session-created', function (session) {
  session.setPermissionRequestHandler(pagePermissionRequestHandler)
  session.setPermissionCheckHandler(pagePermissionCheckHandler)
})

ipc.on('permissionGranted', function (e, permissionId) {
  for (var i = 0; i < pendingPermissions.length; i++) {
    if (permissionId && pendingPermissions[i].permissionId === permissionId) {
      pendingPermissions[i].granted = true
      pendingPermissions[i].callback(true)
      grantedPermissions.push(pendingPermissions[i])
      pendingPermissions.splice(i, 1)

      sendPermissionsToRenderer()
      break
    }
  }
})
