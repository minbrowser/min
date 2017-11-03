/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

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

    getWebview(viewerTabId).executeJavaScript('printDocument()', false)
  },
  handlePDFOpenEvent: function (event, data) {
    var PDFurl = PDFViewer.url.base + PDFViewer.url.queryString.replace('%l', encodeURIComponent(data.url))

    // we don't know which tab the event came from, so we loop through each tab to find out.

    tabs.get().forEach(function (tab) {
      var webview = getWebview(tab.id)
      if (webview && webview.getWebContents().getId() === data.webContentsId) {
        navigate(tab.id, PDFurl)
      }
    })
  }
}

ipc.on('openPDF', PDFViewer.handlePDFOpenEvent)
