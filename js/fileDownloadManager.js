/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

var PDFViewerURL = 'file://' + __dirname + '/pdfjs/web/viewer.html?url='

ipc.on('openPDF', function (event, filedata) {
  var PDFurl = PDFViewerURL + filedata.url
  var hasOpenedPDF = false

  // we don't know which tab the event came from, so we loop through each tab to find out.

  tabs.get().forEach(function (tab) {
    if (tab.url === filedata.url) {
      navigate(tab.id, PDFurl)
      hasOpenedPDF = true
    }
  })

  if (!hasOpenedPDF) {
    var newTab = tabs.add({
      url: PDFurl
    }, tabs.getIndex(tabs.getSelected()) + 1)

    addTab(newTab, {
      enterEditMode: false
    })

    getWebview(newTab).focus()
  }
})
