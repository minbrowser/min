//http://stackoverflow.com/a/2091331


function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split('&');
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		if (decodeURIComponent(pair[0]) == variable) {
			return decodeURIComponent(pair[1]);
		}
	}
	console.log('Query variable %s not found', variable);
}

var rv = $("#reader-view");
var backbutton = $("#backtoarticle");

var emptyHTMLdocument = "<!DOCTYPE html><html><head></head><body></body></html>"

function startReaderView(article) {

	document.body.removeChild(iframe);

	window.rframe = document.createElement("iframe");
	rframe.classList.add("reader-frame");
	rframe.sandbox = "allow-same-origin allow-popups";
	rframe.srcdoc = emptyHTMLdocument;

	rframe.onload = function () {

		if (!article) { //we couln't parse an article
			rframe.contentDocument.body.innerHTML = "<div class='reader-main'><em>No article found.</em></div><link rel='stylesheet' href='readerView.css'>";
			return;
		}

		var readerContent = "<div class='reader-main'>" + "<h1 class='article-title'>" + (article.title || "") + "</h1>"

		if (article.byline) {
			readerContent += "<h2 class='article-authors'>" + article.byline + "</h2>"
		}

		readerContent += article.content + "</div>";

		rframe.contentDocument.body.innerHTML = "<link rel='stylesheet' href='readerView.css'>" + readerContent;

		setTimeout(function () { //wait for stylesheet to load
			rframe.height = rframe.contentDocument.body.querySelector(".reader-main").scrollHeight + "px";
			rframe.focus(); //allows spacebar page down and arrow keys to work correctly
		}, 300);

		if (article.title) {
			document.title = article.title;
		}


		/* site-specific workarounds */

		//needed for wikipedia.org

		var images = rframe.contentDocument.querySelectorAll("img")

		for (var i = 0; i < images.length; i++) {
			if (images[i].src && images[i].srcset) {
				images[i].srcset = "";
			}
		}
	}

	document.body.appendChild(rframe);

	backbutton.on("click", function (e) {
		window.location = url;
	});

}

//iframe hack to securely parse the document

var url = getQueryVariable("url");

document.title = "Reader View | " + url

var iframe = document.createElement("iframe");
iframe.classList.add("temporary-iframe");
iframe.sandbox = "allow-same-origin";
document.body.appendChild(iframe);

$.ajax(url)
	.done(function (data) {
		window.d = data;
		iframe.srcdoc = d;

		iframe.onload = function () {

			var doc = iframe.contentDocument;

			var location = new URL(url);

			//in order for links to work correctly, they all need to open in a new tab

			var links = doc.querySelectorAll("a");

			if (links) {
				for (var i = 0; i < links.length; i++) {
					links[i].target = "_blank";
				}
			}

			var uri = {
				spec: location.href,
				host: location.host,
				prePath: location.protocol + "//" + location.host,
				scheme: location.protocol.substr(0, location.protocol.indexOf(":")),
				pathBase: location.protocol + "//" + location.host + location.pathname.substr(0, location.pathname.lastIndexOf("/") + 1)
			};
			var article = new Readability(uri, doc).parse();
			console.log(article);
			startReaderView(article);
		}

	})
	.fail(function (data) {
		console.info("request failed with error", data);

		startReaderView({
			content: "<em>Failed to load article.</em>"
		});
	});
