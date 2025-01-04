const windows = {
  openWindows: [],
  hasEverCreatedWindow: false,
  nextId: 1,
  windowFromContents: function (webContents) {
    return windows.openWindows.find(w => getWindowWebContents(w.win).id === webContents.id)
  },
  addWindow: function (window) {
    windows.hasEverCreatedWindow = true

    windows.openWindows.push({
      id: windows.nextId.toString(),
      win: window,
      state: {}
    })

    window.on('focus', function () {
      windows.getState(window).lastFocused = Date.now()
    })

    window.on('close', function() {
      // detach WebContentsViews to ensure they aren't destroyed when the window is closed
      window.getContentView().children.slice(1).forEach(child => window.getContentView().removeChildView(child))
      windows.openWindows.find(w => w.win === window).closed = true
    })

    window.on('closed', function() {
      windows.removeWindow(window)

      // Quit on last window closed (ignoring secondary and hidden windows)
      if (windows.openWindows.length === 0 && process.platform !== 'darwin') {
        app.quit()
      }
    })
  
    windows.nextId++
  },
  removeWindow: function (window) {
    windows.openWindows.splice(windows.openWindows.findIndex(w => w.win === window), 1)

    //unload WebContentsViews when all windows are closed
    if (windows.openWindows.length === 0) {
      destroyAllViews()
    }
  },
  getCurrent: function () {
    const lastFocused = windows.openWindows.filter(w => !w.closed).sort((a, b) => b.state.lastFocused - a.state.lastFocused)[0]
    if (lastFocused) {
      return lastFocused.win
    } else {
      return null
    }
  },
  getAll: function () {
    return windows.openWindows.filter(w => !w.closed).map(w => w.win)
  },
  getState: function (window) {
    return windows.openWindows.find(w => w.win === window).state
  }
}
