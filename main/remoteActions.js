/*
Wraps APIs that are only available in the main process in IPC messages, so that the BrowserWindow can use them
*/

ipc.handle('test-invoke', function () {
  return 1
})

ipc.handle('reloadWindow', function () {
  mainWindow.webContents.reload()
})

ipc.handle('startFileDrag', function (e, path) {
  app.getFileIcon(path, {}).then(function (icon) {
    mainWindow.webContents.startDrag({
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

ipc.handle('showOpenDialog', function (e, options) {
  return dialog.showOpenDialogSync(mainWindow, options)
})

ipc.handle('showSaveDialog', function (e, options) {
  return dialog.showSaveDialogSync(mainWindow, options)
})

ipc.handle('addWordToSpellCheckerDictionary', function (e, word) {
  session.fromPartition('persist:webcontent').addWordToSpellCheckerDictionary(word)
})

ipc.handle('downloadURL', function (e, url) {
  mainWindow.webContents.downloadURL(url)
})

ipc.handle('clearStorageData', function () {
  /* It's important not to delete data from file:// here, since that would also remove internal browser data (such as bookmarks) */
  return session.fromPartition('persist:webcontent').clearStorageData({ origin: 'http://' })
    .then(function () {
      session.fromPartition('persist:webcontent').clearStorageData({ origin: 'https://' })
    })
})

/* window actions */

ipc.handle('minimize', function (e) {
  mainWindow.minimize()
  // workaround for https://github.com/minbrowser/min/issues/1662
  mainWindow.webContents.send('minimize')
})

ipc.handle('maximize', function (e) {
  mainWindow.maximize()
  // workaround for https://github.com/minbrowser/min/issues/1662
  mainWindow.webContents.send('maximize')
})

ipc.handle('unmaximize', function (e) {
  mainWindow.unmaximize()
  // workaround for https://github.com/minbrowser/min/issues/1662
  mainWindow.webContents.send('unmaximize')
})

ipc.handle('close', function (e) {
  mainWindow.close()
})

ipc.handle('setFullScreen', function (e, fullScreen) {
  mainWindow.setFullScreen(e, fullScreen)
})
