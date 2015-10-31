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
	rframe.sandbox = "allow-same-origin";
	rframe.srcdoc = emptyHTMLdocument;

	rframe.onload = function () {

		if (!article) { //we couln't parse an article
			rframe.contentDocument.body.innerHTML = "<div class='reader-main'><em>No article found.</em></div>";
			rframe.contentDocument.body.insertAdjacentHTML("afterbegin", "<link rel='stylesheet' href='readerView.css'>");
			return;
		}

		rframe.contentDocument.body.innerHTML = "<div class='reader-main'>" + "<h1 class='article-title'>" + (article.title || "Untitled") + "</h1>" + "<h2 class='article-authors'>" + (article.byline || "") + "</h2>" + article.content + "</div>";
		document.title = article.title;
		rframe.contentDocument.body.insertAdjacentHTML("afterbegin", "<link rel='stylesheet' href='readerView.css'>");


		setTimeout(function () { //wait for stylesheet to load
			rframe.height = rframe.contentDocument.body.querySelector(".reader-main").scrollHeight + "px";
		}, 250);

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
iframe.srcdoc = emptyHTMLdocument;

$.ajax(url)
	.done(function (data) {
		window.d = data;
		iframe.srcdoc = d;

		iframe.onload = function () {

			var doc = iframe.contentDocument;

			//hack to generate a location object from a url - an a element has all the properties (pathname, host, protocol, etc)
			var location = document.createElement("a");
			location.href = url;


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

		document.body.appendChild(iframe);



	})
