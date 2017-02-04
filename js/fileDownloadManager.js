/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

var PDFViewerURL = 'file://' + __dirname + '/pdfjs/web/viewer.html?url='

ipc.on('openPDF', function (event, data) {
  var PDFurl = PDFViewerURL + data.url

  // we don't know which tab the event came from, so we loop through each tab to find out.

  tabs.get().forEach(function (tab) {
    var webview = getWebview(tab.id)
    if (webview && webview.getWebContents().getId() === data.webContentsId) {
      navigate(tab.id, PDFurl)
    }
  })
})
