/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

var browserUI = require('api-wrapper.js')

var PDFViewer = {
  url: {
    base: 'file://' + __dirname + '/pages/pdfViewer/index.html',
    queryString: '?url=%l'
  },
  isPDFViewer: function (tabId) {
    return tabs.get(tabId).url.startsWith(PDFViewer.url.base)
  },
  printPDF: function (viewerTabId) {
    if (!PDFViewer.isPDFViewer(viewerTabId)) {
      throw new Error("attempting to print in a tab that isn't a PDF viewer")
    }

    webviews.get(viewerTabId).executeJavaScript('parentProcessActions.printPDF()', false)
  },
  savePDF: function (viewerTabId) {
    if (!PDFViewer.isPDFViewer(viewerTabId)) {
      throw new Error("attempting to save in a tab that isn't a PDF viewer")
    }

    webviews.get(viewerTabId).executeJavaScript('parentProcessActions.downloadPDF()', false)
  },
  startFindInPage: function (viewerTabId) {
    if (!PDFViewer.isPDFViewer(viewerTabId)) {
      throw new Error("attempting to call startFindInPage in a tab that isn't a PDF viewer")
    }

    webviews.get(viewerTabId).executeJavaScript('parentProcessActions.startFindInPage()', false)
  },
  endFindInPage: function (viewerTabId) {
    if (!PDFViewer.isPDFViewer(viewerTabId)) {
      throw new Error("attempting to call endFindInPage in a tab that isn't a PDF viewer")
    }

    webviews.get(viewerTabId).executeJavaScript('parentProcessActions.endFindInPage()', false)
  },
  handlePDFOpenEvent: function (event, data) {
    var PDFurl = PDFViewer.url.base + PDFViewer.url.queryString.replace('%l', encodeURIComponent(data.url))

    // we don't know which tab the event came from, so we loop through each tab to find out.

    tabs.get().forEach(function (tab) {
      var webview = webviews.get(tab.id)
      if (webview && webview.id === data.webContentsId) {
        browserUI.navigate(tab.id, PDFurl)
      }
    })
  }
}

ipc.on('openPDF', PDFViewer.handlePDFOpenEvent)

/*
migrate legacy bookmarked PDFs to the new viewer URL
TODO remove this in a future version
*/

var legacyPDFViewerURL = 'file://' + __dirname + '/pdfjs/web/viewer.html?url='

db.transaction('rw', db.places, function () {
  db.places.where('url').startsWith(legacyPDFViewerURL).each(function (item) {
    var oldItemURL = item.url

    var pdfBaseURL = oldItemURL.replace(legacyPDFViewerURL, '')
    var newViewerURL = PDFViewer.url.base + PDFViewer.url.queryString.replace('%l', encodeURIComponent(pdfBaseURL))

    item.url = newViewerURL

    db.places.put(item).then(function () {
      db.places.where('url').equals(oldItemURL).delete()
    })
  })
})
