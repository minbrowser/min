/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

var PDFViewerURL = "file://" + __dirname + "/pdfjs/web/viewer.html?url=";

ipc.on("openPDF", function (data) {
	console.log(data);
	var cTab = tabs.get(tabs.getSelected());
	var webview = getWebview(cTab.id);

	//If the current tab is blank or has the url of the pdf we are opening, we open the pdf in the current tab. Otherwise, to avoid losing pages, we open a new tab with the pdf.

	var PDFurl = PDFViewerURL + data.url;

	if (cTab.url == PDFurl) { //if we are already on the pdf we are navigating to, ignore it
		return;
	}


	if (cTab.url == "about:blank" || cTab.url == data.item.url) {
		navigate(tabs.getSelected(), PDFurl)
	} else {

		var newTab = tabs.add({
			url: PDFurl
		})

		addTab(newTab, {
			focus: false
		});

	}
});
