const windows = {
  openWindows: [],
  hasEverCreatedWindow: false,
  nextId: 1,
  windowFromContents: function (webContents) {
    return windows.openWindows.find(w => w.win.webContents.id === webContents.id)
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
      //if the BrowserView is still attached to the window on close, Electron will destroy it automatically, but we want to manage it ourselves
      window.setBrowserView(null)
      windows.openWindows.find(w => w.win === window).closed = true;
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

    //unload BrowserViews when all windows are closed
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
