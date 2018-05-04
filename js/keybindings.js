/* defines keybindings that aren't in the menu (so they aren't defined by menu.js). For items in the menu, also handles ipc messages */

ipc.on('zoomIn', function () {
  webviewGestures.zoomWebviewIn(tabs.getSelected())
})

ipc.on('zoomOut', function () {
  webviewGestures.zoomWebviewOut(tabs.getSelected())
})

ipc.on('zoomReset', function () {
  webviewGestures.resetWebviewZoom(tabs.getSelected())
})

ipc.on('print', function () {
  if (PDFViewer.isPDFViewer(tabs.getSelected())) {
    PDFViewer.printPDF(tabs.getSelected())
  } else {
    webviews.get(tabs.getSelected()).print()
  }
})

ipc.on('findInPage', function () {
  findinpage.start()
})

ipc.on('inspectPage', function () {
  webviews.get(tabs.getSelected()).openDevTools()
})

ipc.on('showReadingList', function () {
  // open the searchbar with "!readinglist " as the input
  tabBar.enterEditMode(tabs.getSelected(), '!readinglist ')
})

ipc.on('addTab', function (e, data) {
  /* new tabs can't be created in focus mode */
  if (isFocusMode) {
    showFocusModeError()
    return
  }

  // if opening a URL (instead of adding an empty tab), and only an empty tab is open, navigate the current tab rather than creating another one
  if (tabs.isEmpty() && data.url) {
    navigate(tabs.getSelected(), data.url)
  } else {
    var newIndex = tabs.getIndex(tabs.getSelected()) + 1
    var newTab = tabs.add({
      url: data.url || ''
    }, newIndex)

    addTab(newTab, {
      enterEditMode: !data.url // only enter edit mode if the new tab is about:blank
    })
  }
})

ipc.on('saveCurrentPage', function () {
  var currentTab = tabs.get(tabs.getSelected())

  // new tabs cannot be saved
  if (!currentTab.url) {
    return
  }

  // if the current tab is a PDF, let the PDF viewer handle saving the document
  if (PDFViewer.isPDFViewer(tabs.getSelected())) {
    PDFViewer.savePDF(tabs.getSelected())
    return
  }

  var savePath = remote.dialog.showSaveDialog(remote.getCurrentWindow(), {})

  // savePath will be undefined if the save dialog is canceled
  if (savePath) {
    if (!savePath.endsWith('.html')) {
      savePath = savePath + '.html'
    }
    webviews.get(currentTab.id).getWebContents().savePage(savePath, 'HTMLComplete', function () {})
  }
})

function addPrivateTab () {
  /* new tabs can't be created in focus mode */
  if (isFocusMode) {
    showFocusModeError()
    return
  }

  if (tabs.isEmpty()) {
    destroyTab(tabs.getAtIndex(0).id)
  }

  var newIndex = tabs.getIndex(tabs.getSelected()) + 1

  var privateTab = tabs.add({
    url: 'about:blank',
    private: true
  }, newIndex)
  addTab(privateTab)
}

ipc.on('addPrivateTab', addPrivateTab)

ipc.on('addTask', function () {
  /* new tasks can't be created in focus mode */
  if (isFocusMode) {
    showFocusModeError()
    return
  }

  addTask()
  taskOverlay.show()
  setTimeout(function () {
    taskOverlay.hide()
    tabBar.enterEditMode(tabs.getSelected())
  }, 600)
})

ipc.on('goBack', function () {
  try {
    webviews.get(tabs.getSelected()).goBack()
  } catch (e) {}
})

ipc.on('goForward', function () {
  try {
    webviews.get(tabs.getSelected()).goForward()
  } catch (e) {}
})

var menuBarShortcuts = ['mod+t', 'shift+mod+p', 'mod+n'] // shortcuts that are already used for menu bar items

function defineShortcut (keyMapName, fn) {
  Mousetrap.bind(keyMap[keyMapName], function (e, combo) {
    // these shortcuts are already used by menu bar items, so also using them here would result in actions happening twice
    if (menuBarShortcuts.indexOf(combo) !== -1) {
      return
    }
    // mod+left and mod+right are also text editing shortcuts, so they should not run when an input field is focused
    // also block single-letter shortcuts when an input field is focused, so that it's still possible to type in an input
    if (!combo.includes('+') || combo === 'mod+left' || combo === 'mod+right') {
      var webview = webviews.get(tabs.getSelected())
      if (!webview.src) {
        fn(e, combo)
      } else {
        webview.executeJavaScript('document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA"', function (isInputFocused) {
          if (isInputFocused === false) {
            fn(e, combo)
          }
        })
      }
    } else {
      // other shortcuts can run immediately
      fn(e, combo)
    }
  })
}

settings.get('keyMap', function (keyMapSettings) {
  keyMap = userKeyMap(keyMapSettings)

  var Mousetrap = require('mousetrap')

  window.Mousetrap = Mousetrap
  defineShortcut('addPrivateTab', addPrivateTab)

  defineShortcut('enterEditMode', function (e) {
    tabBar.enterEditMode(tabs.getSelected())
    return false
  })

  defineShortcut('closeTab', function (e) {
    // prevent mod+w from closing the window
    e.preventDefault()
    e.stopImmediatePropagation()

    closeTab(tabs.getSelected())

    return false
  })

  defineShortcut('restoreTab', function (e) {
    if (isFocusMode) {
      showFocusModeError()
      return
    }

    var restoredTab = window.currentTask.tabHistory.pop()

    // The tab history stack is empty
    if (!restoredTab) {
      return
    }

    if (tabs.isEmpty()) {
      destroyTab(tabs.getAtIndex(0).id)
    }

    addTab(tabs.add(restoredTab, tabs.getIndex(tabs.getSelected()) + 1), {
      focus: false,
      leaveEditMode: true,
      enterEditMode: false
    })
  })

  defineShortcut('addToFavorites', function (e) {
    bookmarks.handleStarClick(tabBar.getTab(tabs.getSelected()).querySelector('.bookmarks-button'))
    tabBar.enterEditMode(tabs.getSelected()) // we need to show the bookmarks button, which is only visible in edit mode
  })

  // cmd+x should switch to tab x. Cmd+9 should switch to the last tab

  for (var i = 1; i < 9; i++) {
    (function (i) {
      Mousetrap.bind('mod+' + i, function (e) {
        var currentIndex = tabs.getIndex(tabs.getSelected())
        var newTab = tabs.getAtIndex(currentIndex + i) || tabs.getAtIndex(currentIndex - i)
        if (newTab) {
          switchToTab(newTab.id)
        }
      })

      Mousetrap.bind('shift+mod+' + i, function (e) {
        var currentIndex = tabs.getIndex(tabs.getSelected())
        var newTab = tabs.getAtIndex(currentIndex - i) || tabs.getAtIndex(currentIndex + i)
        if (newTab) {
          switchToTab(newTab.id)
        }
      })
    })(i)
  }

  defineShortcut('gotoLastTab', function (e) {
    switchToTab(tabs.getAtIndex(tabs.count() - 1).id)
  })

  defineShortcut('gotoFirstTab', function (e) {
    switchToTab(tabs.getAtIndex(0).id)
  })

  Mousetrap.bind('esc', function (e) {
    taskOverlay.hide()
    tabBar.leaveEditMode()

    var webview = webviews.get(tabs.getSelected())

    // exit full screen mode
    if (webview.executeJavaScript) {
      webview.executeJavaScript('if(document.webkitIsFullScreen){document.webkitExitFullscreen()}')
    }

    if (document.activeElement !== webview) {
      webview.focus()
    }
  })

  defineShortcut('toggleReaderView', function () {
    var tab = tabs.get(tabs.getSelected())

    if (tab.isReaderView) {
      readerView.exit(tab.id)
    } else {
      readerView.enter(tab.id)
    }
  })

  // TODO add help docs for this

  defineShortcut('goBack', function (d) {
    webviews.get(tabs.getSelected()).goBack()
  })

  defineShortcut('goForward', function (d) {
    webviews.get(tabs.getSelected()).goForward()
  })

  defineShortcut('switchToPreviousTab', function (d) {
    var currentIndex = tabs.getIndex(tabs.getSelected())
    var previousTab = tabs.getAtIndex(currentIndex - 1)

    if (previousTab) {
      switchToTab(previousTab.id)
    } else {
      switchToTab(tabs.getAtIndex(tabs.count() - 1).id)
    }
  })

  defineShortcut('switchToNextTab', function (d) {
    var currentIndex = tabs.getIndex(tabs.getSelected())
    var nextTab = tabs.getAtIndex(currentIndex + 1)

    if (nextTab) {
      switchToTab(nextTab.id)
    } else {
      switchToTab(tabs.getAtIndex(0).id)
    }
  })

  var taskSwitchTimeout = null

  defineShortcut('switchToNextTask', function (d) {
    taskOverlay.show()

    var currentTaskIdx = tasks.get().map(function (task) {
      return task.id
    }).indexOf(currentTask.id)

    if (tasks.get()[currentTaskIdx + 1]) {
      switchToTask(tasks.get()[currentTaskIdx + 1].id)
    } else {
      switchToTask(tasks.get()[0].id)
    }

    taskOverlay.show()

    clearInterval(taskSwitchTimeout)
    taskSwitchTimeout = setTimeout(function () {
      taskOverlay.hide()
    }, 500)
  })

  defineShortcut('switchToPreviousTask', function (d) {
    taskOverlay.show()

    var currentTaskIdx = tasks.get().map(function (task) {
      return task.id
    }).indexOf(currentTask.id)

    if (tasks.get()[currentTaskIdx - 1]) {
      switchToTask(tasks.get()[currentTaskIdx - 1].id)
    } else {
      switchToTask(tasks.get()[tasks.get().length - 1].id)
    }

    taskOverlay.show()

    clearInterval(taskSwitchTimeout)
    taskSwitchTimeout = setTimeout(function () {
      taskOverlay.hide()
    }, 500)
  })

  defineShortcut('closeAllTabs', function (d) { // destroys all current tabs, and creates a new, empty tab. Kind of like creating a new window, except the old window disappears.
    var tset = tabs.get()
    for (var i = 0; i < tset.length; i++) {
      destroyTab(tset[i].id)
    }

    addTab() // create a new, blank tab
  })

  defineShortcut('toggleTasks', function () {
    if (taskOverlay.isShown) {
      taskOverlay.hide()
    } else {
      taskOverlay.show()
    }
  })

  var lastReload = 0

  defineShortcut('reload', function () {
    var time = Date.now()

    // pressing mod+r twice in a row reloads the whole browser
    if (time - lastReload < 500) {
      window.location.reload()
    } else {
      // the webview.reload() method can't be used because if the webview is displaying an error page, we want to reload the original page rather than show the error page again
      navigate(tabs.getSelected(), tabs.get(tabs.getSelected()).url)
    }

    lastReload = time
  })

  // mod+enter navigates to searchbar URL + ".com"
  defineShortcut('completeSearchbar', function () {
    if (currentSearchbarInput) { // if the searchbar is open
      var value = currentSearchbarInput.value

      tabBar.leaveEditMode()

      // if the text is already a URL, navigate to that page
      if (urlParser.isURLMissingProtocol(value)) {
        navigate(tabs.getSelected(), value)
      } else {
        navigate(tabs.getSelected(), urlParser.parse(value + '.com'))
      }
    }
  })

  defineShortcut('showAndHideMenuBar', function () {
    toggleMenuBar()
  })

  defineShortcut('followLink', function () {
    findinpage.end({ action: 'activateSelection' })
  })
}) // end settings.get

// reload the webview when the F5 key is pressed
document.body.addEventListener('keydown', function (e) {
  if (e.keyCode === 116) {
    try {
      webviews.get(tabs.getSelected()).reloadIgnoringCache()
    } catch (e) {}
  }
})
