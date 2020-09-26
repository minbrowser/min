const currrentDownloadItems = {}

ipc.on('cancelDownload', function (e, path) {
  if (currrentDownloadItems[path]) {
    currrentDownloadItems[path].cancel()
  }
})

function downloadHandler (event, item, webContents) {
  var itemURL = item.getURL()
  if (item.getMimeType() === 'application/pdf' && itemURL.indexOf('blob:') !== 0 && itemURL.indexOf('#pdfjs.action=download') === -1) { // clicking the download button in the viewer opens a blob url, so we don't want to open those in the viewer (since that would make it impossible to download a PDF)
    event.preventDefault()
    sendIPCToWindow(mainWindow, 'openPDF', {
      url: itemURL,
      tabId: getViewIDFromWebContents(webContents),
      event: event,
      item: item // as of electron 0.35.1, this is an empty object
    })
  } else {
    // send info to download manager
    sendIPCToWindow(mainWindow, 'download-info', {
      path: item.getSavePath(),
      name: item.getFilename(),
      status: 'progressing',
      size: { received: 0, total: item.getTotalBytes() }
    })

    item.on('updated', function (e, state) {
      if (item.getSavePath()) {
        currrentDownloadItems[item.getSavePath()] = item
      }
      sendIPCToWindow(mainWindow, 'download-info', {
        path: item.getSavePath(),
        name: item.getFilename(),
        status: state,
        size: { received: item.getReceivedBytes(), total: item.getTotalBytes() }
      })
    })

    item.once('done', function (e, state) {
      delete currrentDownloadItems[item.getSavePath()]
      sendIPCToWindow(mainWindow, 'download-info', {
        path: item.getSavePath(),
        name: item.getFilename(),
        status: state,
        size: { received: item.getTotalBytes(), total: item.getTotalBytes() }
      })
    })
  }
  return true
}

// workaround for https://github.com/electron/electron/issues/24334
function listenForPDFDownload (ses) {
  ses.webRequest.onHeadersReceived(function (details, callback) {
    if (details.resourceType === 'mainFrame' && details.responseHeaders) {
      var typeHeader = details.responseHeaders[Object.keys(details.responseHeaders).filter(k => k.toLowerCase() === 'content-type')]
      if (typeHeader instanceof Array && typeHeader.filter(t => t.includes('application/pdf')).length > 0 && details.url.indexOf('#pdfjs.action=download') === -1) {
      // open in PDF viewer instead
        callback({ cancel: true })
        sendIPCToWindow(mainWindow, 'openPDF', {
          url: details.url,
          tabId: null
        })
        return
      }
    }
    callback({ cancel: false })
  })
}

app.once('ready', function () {
  session.defaultSession.on('will-download', downloadHandler)
  listenForPDFDownload(session.defaultSession)
})

app.on('session-created', function (session) {
  session.on('will-download', downloadHandler)
  listenForPDFDownload(session)
})
