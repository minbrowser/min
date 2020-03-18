/* Handles messages that get sent from the menu bar in the main process */

var webviews = require('webviews.js')
var webviewGestures = require('webviewGestures.js')
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var modalMode = require('modalMode.js')
var findinpage = require('findinpage.js')
var PDFViewer = require('pdfViewer.js')

function addPrivateTab () {
  /* new tabs can't be created in modal mode */
  if (modalMode.enabled()) {
    return
  }

  /* new tabs can't be created in focus mode */
  if (focusMode.enabled()) {
    focusMode.warn()
    return
  }

  if (!tabs.get(tabs.getSelected()).url && !tabs.get(tabs.getSelected()).private) {
    browserUI.destroyTab(tabs.getSelected())
  }

  var privateTab = tabs.add({
    private: true
  })
  browserUI.addTab(privateTab)
}

module.exports = {
  initialize: function () {
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
      } else if (readerView.isReader(tabs.getSelected())) {
        readerView.printArticle(tabs.getSelected())
      } else {
      // TODO figure out why webContents.print() doesn't work in Electron 4
        webviews.callAsync(tabs.getSelected(), 'executeJavaScript', 'window.print()')
      }
    })

    ipc.on('findInPage', function () {
      /* Page search is not available in modal mode. */
      if (modalMode.enabled()) {
        return
      }

      findinpage.start()
    })

    ipc.on('inspectPage', function () {
      webviews.get(tabs.getSelected()).openDevTools()
    })

    ipc.on('showReadingList', function () {
        // open the searchbar with "!readinglist " as the input
      tabBar.enterEditMode(tabs.getSelected(), '!readinglist ')
    })

    ipc.on('showBookmarks', function () {
      tabBar.enterEditMode(tabs.getSelected(), '!bookmarks ')
    })

    ipc.on('showHistory', function () {
      tabBar.enterEditMode(tabs.getSelected(), '!history ')
    })

    ipc.on('duplicateTab', function (e) {
      /* new tabs can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tabs can't be created in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

        // can't duplicate if tabs is empty
      if (tabs.isEmpty()) {
        return
      }

      const sourceTab = tabs.get(tabs.getSelected())
        // strip tab id so that a new one is generated
      const newTab = tabs.add({...sourceTab, id: undefined})

      // duplicate scroll position as well
      let scrollPosition = 0
      webviews.callAsync(sourceTab.id, 'executeJavaScript', '(function() {return window.scrollY})()', function (err, data) {
        scrollPosition = data
      })

      const listener = function (webview, tabId, e) {
        if (tabId === newTab) {
          // the scrollable content may not be available until some time after the load event, so attempt scrolling several times
          for (let i = 0; i < 3; i++) {
            setTimeout(function () {
              webviews.callAsync(newTab, 'executeJavaScript', `window.scrollTo(0, ${scrollPosition})`)
            }, 750 * i)
          }
          webviews.unbindEvent('did-finish-load', listener)
        }
      }
      webviews.bindEvent('did-finish-load', listener)

      browserUI.addTab(newTab, { enterEditMode: false })
    })

    ipc.on('addTab', function (e, data) {
      /* new tabs can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tabs can't be created in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

        // if opening a URL (instead of adding an empty tab), and the current tab is empty, navigate the current tab rather than creating another one
      if (!tabs.get(tabs.getSelected()).url && data.url) {
        browserUI.navigate(tabs.getSelected(), data.url)
      } else {
        var newTab = tabs.add({
          url: data.url || ''
        })

        browserUI.addTab(newTab, {
          enterEditMode: !data.url // only enter edit mode if the new tab is empty
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

      var savePath = remote.dialog.showSaveDialogSync(remote.getCurrentWindow(), {})

        // savePath will be undefined if the save dialog is canceled
      if (savePath) {
        if (!savePath.endsWith('.html')) {
          savePath = savePath + '.html'
        }
        webviews.get(currentTab.id).savePage(savePath, 'HTMLComplete')
      }
    })

    ipc.on('addPrivateTab', addPrivateTab)

    ipc.on('addTask', function () {
      /* new tasks can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tasks can't be created in focus mode or modal mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      browserUI.addTask()
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
  }
}
