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

function cacheArticleForOffline(url, html) {
	var data = {
		version: 1,
		createdAt: Date.now(),
		html: html,
	}
	localStorage.setItem("readerview-cachedPage-" + url, JSON.stringify(data));
}

//remove old articles

function cleanupOfflineArticles() {
	var currentDate = Date.now();
	var oneMonthInMS = 30 * 24 * 60 * 60 * 1000;
	for (var item in localStorage) {
		if (item.indexOf("readerview-cachedPage-") == 0) {
			try {
				var itemDate = JSON.parse(localStorage[item]).createdAt;
			} catch (e) {
				var itemDate = 0;
			}
			if (currentDate - itemDate > oneMonthInMS) {
				localStorage.removeItem(item);
			}
		}
	}
}

setTimeout(cleanupOfflineArticles, 5000);

function getOfflineArticle(url) {
	return localStorage.getItem("readerview-cachedPage-" + url);
}

var backbutton = document.getElementById("backtoarticle");

var emptyHTMLdocument = "<!DOCTYPE html><html><head></head><body></body></html>"

function startReaderView(article) {

	document.body.removeChild(parserframe);

	var readerContent = "<link rel='stylesheet' href='readerView.css'>";

	if (!article) { //we couln't parse an article
		readerContent += "<div class='reader-main'><em>No article found.</em></div>";
	} else {
		document.title = article.title;

		readerContent += "<div class='reader-main'>" + "<h1 class='article-title'>" + (article.title || "") + "</h1>"

		if (article.byline) {
			readerContent += "<h2 class='article-authors'>" + article.byline + "</h2>"
		}

		readerContent += article.content + "</div>";

	}


	window.rframe = document.createElement("iframe");
	rframe.classList.add("reader-frame");
	rframe.sandbox = "allow-same-origin allow-popups";
	rframe.srcdoc = readerContent;

	rframe.onload = function () {

		requestAnimationFrame(function () {
			rframe.height = rframe.contentDocument.body.querySelector(".reader-main").scrollHeight + "px";
			requestAnimationFrame(function () {
				rframe.focus(); //allows spacebar page down and arrow keys to work correctly
			});
		});

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

	backbutton.addEventListener("click", function (e) {
		window.location = url;
	});

	//make findinpage search the sandboxed iframe and not the parent window

	window.find = function () {
		rframe.contentWindow.find.apply(rframe.contentWindow, arguments);
	};

}

//iframe hack to securely parse the document

var url = getQueryVariable("url");

document.title = "Reader View | " + url

var parserframe = document.createElement("iframe");
parserframe.className = "temporary-iframe";
parserframe.sandbox = "allow-same-origin";
document.body.appendChild(parserframe);

function processArticle(data) {

	cacheArticleForOffline(url, data);

	window.d = data;
	parserframe.srcdoc = d;

	parserframe.onload = function () {

		var doc = parserframe.contentDocument;

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

}

fetch(url)
	.then(function (response) {
		return response.text();
	})
	.then(processArticle)
	.catch(function (data) {
		console.warn("request failed with error", data);

		var cachedData = getOfflineArticle(url);

		if (cachedData) {
			console.log("offline article found, displaying");
			processArticle(JSON.parse(cachedData).html);
		} else {
			startReaderView({
				content: "<em>Failed to load article.</em>"
			});
		}
	});
