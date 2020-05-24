/* Handles messages that get sent from the menu bar in the main process */

var webviews = require('webviews.js')
var webviewGestures = require('webviewGestures.js')
var browserUI = require('browserUI.js')
var focusMode = require('focusMode.js')
var modalMode = require('modalMode.js')
var findinpage = require('findinpage.js')
var PDFViewer = require('pdfViewer.js')
var tabEditor = require('navbar/tabEditor.js')
var readerView = require('readerView.js')

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
      webviews.callAsync(tabs.getSelected(), 'openDevTools')
    })

    ipc.on('showReadingList', function () {
        // open the searchbar with "!readinglist " as the input
      tabEditor.show(tabs.getSelected(), '!readinglist ')
    })

    ipc.on('showBookmarks', function () {
      tabEditor.show(tabs.getSelected(), '!bookmarks ')
    })

    ipc.on('showHistory', function () {
      tabEditor.show(tabs.getSelected(), '!history ')
    })

    ipc.on('duplicateTab', function (e) {
      if (modalMode.enabled()) {
        return
      }

      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      browserUI.duplicateTab(tabs.getSelected())
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

      var newTab = tabs.add({
        url: data.url || ''
      })

      browserUI.addTab(newTab, {
        enterEditMode: !data.url // only enter edit mode if the new tab is empty
      })
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
        webviews.callAsync(tabs.getSelected(), 'savePage', [savePath, 'HTMLComplete'])
      }
    })

    ipc.on('addPrivateTab', function () {
      /* new tabs can't be created in modal mode */
      if (modalMode.enabled()) {
        return
      }

      /* new tabs can't be created in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      browserUI.addTab(tabs.add({
        private: true
      }))
    })

    ipc.on('goBack', function () {
      webviews.callAsync(tabs.getSelected(), 'goBack')
    })

    ipc.on('goForward', function () {
      webviews.callAsync(tabs.getSelected(), 'goForward')
    })
  }
}
