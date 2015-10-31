/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

var PDFViewerUrl = "file://" + __dirname + "/pdfjs/web/viewer.html?url=";

ipc.on("openPDF", function (data) {
	var webview = getWebview(tabs.getSelected());

	//If the current tab is blank or has the url of the pdf we are opening, we open the pdf in the current tab. Otherwise, to avoid losing pages, we open a new tab with the pdf.

	var PDFurl = PDFViewerUrl + data.item.url;


	if (tabs.get(tabs.getSelected()).url == "about:blank" || tabs.get(tabs.getSelected()).url == data.item.url) {
		navigate(tabs.getSelected(), PDFurl)
	} else {

		var newTab = tabs.add({
			url: PDFViewerUrl + data.item.url
		})

		addTab(newTab, {
			focus: false
		});

	}
});
