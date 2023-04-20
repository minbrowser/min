const windows = {
  openWindows: [],
  nextId: 1,
  windowFromContents: function (webContents) {
    return windows.openWindows.find(w => w.win.webContents.id === webContents.id)
  },
  addWindow: function (window) {
    windows.openWindows.push({
      id: windows.nextId.toString(),
      win: window,
      state: {}
    })

    window.on('focus', function () {
      windows.getState(window).lastFocused = Date.now()
    })
    windows.nextId++
  },
  removeWindow: function (window) {
    windows.openWindows.splice(windows.openWindows.findIndex(w => w.win === window), 1)
  },
  getCurrent: function () {
    const lastFocused = windows.openWindows.sort((a, b) => b.state.lastFocused - a.state.lastFocused)[0]
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
    return windows.openWindows.find(w => w.win === window).state
  }
}
