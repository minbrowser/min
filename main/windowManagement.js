const windows = {
  openWindows: [],
  windowStates: {},
  windowFromContents: function (webContents) {
    return windows.openWindows.find(w => w.win.webContents.id === webContents.id).win
  },
  addWindow: function (window) {
    windows.openWindows.push({
      id: window.id,
      win: window
    })
    windows.windowStates[window.id] = {}

    window.on('focus', function () {
      windows.getState(window).lastFocused = Date.now()
    })
  },
  removeWindow: function (window) {
    delete windows.windowStates[windows.openWindows.find(w => w.win === window).id]
    windows.openWindows.splice(windows.openWindows.findIndex(w => w.win === window), 1)
  },
  getCurrent: function () {
    const lastFocused = windows.openWindows.sort((a, b) => b.lastFocused - b.lastFocused)[0]
    if (lastFocused) {
      return lastFocused.win
    } else {
      return null
    }
  },
  getAll: function () {
    return windows.openWindows.map(w => w.win)
  },
  getState: function (window) {
    return windows.windowStates[window.id]
  }
}
