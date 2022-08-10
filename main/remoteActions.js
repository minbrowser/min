/*
Wraps APIs that are only available in the main process in IPC messages, so that the BrowserWindow can use them
*/

ipc.handle('test-invoke', function () {
  return 1
})

ipc.handle('reloadWindow', function (e) {
  e.sender.reload()
})

ipc.handle('startFileDrag', function (e, path) {
  app.getFileIcon(path, {}).then(function (icon) {
    e.sender.startDrag({
      file: path,
      icon: icon
    })
  })
})

ipc.handle('showFocusModeDialog1', function () {
  dialog.showMessageBox({
    type: 'info',
    buttons: [l('closeDialog')],
    message: l('isFocusMode'),
    detail: l('focusModeExplanation1') + ' ' + l('focusModeExplanation2')
  })
})

ipc.handle('showFocusModeDialog2', function () {
  dialog.showMessageBox({
    type: 'info',
    buttons: [l('closeDialog')],
    message: l('isFocusMode'),
    detail: l('focusModeExplanation2')
  })
})

ipc.handle('showOpenDialog', async function (e, options) {
  const result = await dialog.showOpenDialog(windows.windowFromContents(e.sender), options)
  return result.filePaths
})

ipc.handle('showSaveDialog', async function (e, options) {
  const result = await dialog.showSaveDialog(windows.windowFromContents(e.sender), options)
  return result.filePath
})

ipc.handle('addWordToSpellCheckerDictionary', function (e, word) {
  session.fromPartition('persist:webcontent').addWordToSpellCheckerDictionary(word)
})

ipc.handle('downloadURL', function (e, url) {
  e.sender.downloadURL(url)
})

ipc.handle('clearStorageData', function () {
  return session.fromPartition('persist:webcontent').clearStorageData()
  /* It's important not to delete data from file:// from the default partition, since that would also remove internal browser data (such as bookmarks). However, HTTP data does need to be cleared, as there can be leftover data from loading external resources in the browser UI */
    .then(function () {
      return session.defaultSession.clearStorageData({ origin: 'http://' })
    })
    .then(function () {
      return session.defaultSession.clearStorageData({ origin: 'https://' })
    })
    .then(function () {
      return session.fromPartition('persist:webcontent').clearCache()
    })
    .then(function () {
      return session.fromPartition('persist:webcontent').clearHostResolverCache()
    })
    .then(function () {
      return session.fromPartition('persist:webcontent').clearAuthCache()
    })
    .then(function () {
      return session.defaultSession.clearCache()
    })
    .then(function () {
      return session.defaultSession.clearHostResolverCache()
    })
    .then(function () {
      return session.defaultSession.clearAuthCache()
    })
})

/* window actions */

ipc.handle('minimize', function (e) {
  windows.windowFromContents(e.sender).minimize()
  // workaround for https://github.com/minbrowser/min/issues/1662
  e.sender.send('minimize')
})

ipc.handle('maximize', function (e) {
  windows.windowFromContents(e.sender).maximize()
  // workaround for https://github.com/minbrowser/min/issues/1662
  e.sender.send('maximize')
})

ipc.handle('unmaximize', function (e) {
  windows.windowFromContents(e.sender).unmaximize()
  // workaround for https://github.com/minbrowser/min/issues/1662
  e.sender.send('unmaximize')
})

ipc.handle('close', function (e) {
  windows.windowFromContents(e.sender).close()
})

ipc.handle('setFullScreen', function (e, fullScreen) {
  windows.windowFromContents(e.sender).setFullScreen(e, fullScreen)
})
