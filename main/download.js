const currrentDownloadItems = {}

ipc.on('cancelDownload', function (e, path) {
  if (currrentDownloadItems[path]) {
    currrentDownloadItems[path].cancel()
  }
})

function isAttachment (header) {
  return /^\s*attache*?ment/i.test(header)
}

function downloadHandler (event, item, webContents) {
  var itemURL = item.getURL()
  var attachment = isAttachment(item.getContentDisposition())

  if (item.getMimeType() === 'application/pdf' && itemURL.indexOf('blob:') !== 0 && itemURL.indexOf('#pdfjs.action=download') === -1 && !attachment) { // clicking the download button in the viewer opens a blob url, so we don't want to open those in the viewer (since that would make it impossible to download a PDF)
    event.preventDefault()

    sendIPCToWindow(mainWindow, 'openPDF', {
      url: itemURL,
      tabId: getViewIDFromWebContents(webContents)
    })
  } else {
    var savePathFilename

    // send info to download manager
    sendIPCToWindow(mainWindow, 'download-info', {
      path: item.getSavePath(),
      name: item.getFilename(),
      status: 'progressing',
      size: { received: 0, total: item.getTotalBytes() }
    })

    item.on('updated', function (e, state) {
      if (!savePathFilename) {
        savePathFilename = path.basename(item.getSavePath())
      }

      if (item.getSavePath()) {
        currrentDownloadItems[item.getSavePath()] = item
      }

      sendIPCToWindow(mainWindow, 'download-info', {
        path: item.getSavePath(),
        name: savePathFilename,
        status: state,
        size: { received: item.getReceivedBytes(), total: item.getTotalBytes() }
      })
    })

    item.once('done', function (e, state) {
      delete currrentDownloadItems[item.getSavePath()]
      sendIPCToWindow(mainWindow, 'download-info', {
        path: item.getSavePath(),
        name: savePathFilename,
        status: state,
        size: { received: item.getTotalBytes(), total: item.getTotalBytes() }
      })
    })
  }
  return true
}

function listenForDownloadHeaders (ses) {
  ses.webRequest.onHeadersReceived(function (details, callback) {
    if (details.resourceType === 'mainFrame' && details.responseHeaders) {
      // workaround for https://github.com/electron/electron/issues/24334
      var typeHeader = details.responseHeaders[Object.keys(details.responseHeaders).filter(k => k.toLowerCase() === 'content-type')]
      var attachment = isAttachment(details.responseHeaders[Object.keys(details.responseHeaders).filter(k => k.toLowerCase() === 'content-disposition')])

      if (typeHeader instanceof Array && typeHeader.filter(t => t.includes('application/pdf')).length > 0 && details.url.indexOf('#pdfjs.action=download') === -1 && !attachment) {
      // open in PDF viewer instead
        callback({ cancel: true })
        sendIPCToWindow(mainWindow, 'openPDF', {
          url: details.url,
          tabId: null
        })
        return
      }

      // whether this is a file being viewed in-browser or a page
      // Needed to save files correctly: https://github.com/minbrowser/min/issues/1717
      // It doesn't make much sense to have this here, but only one onHeadersReceived instance can be created per session
      const isFileView = typeHeader instanceof Array && !typeHeader.some(t => t.includes('text/html'))

      sendIPCToWindow(mainWindow, 'set-file-view', {
        url: details.url,
        isFileView
      })
    }
    callback({ cancel: false })
  })
}

app.once('ready', function () {
  session.defaultSession.on('will-download', downloadHandler)
  listenForDownloadHeaders(session.defaultSession)
})

app.on('session-created', function (session) {
  session.on('will-download', downloadHandler)
  listenForDownloadHeaders(session)
})
