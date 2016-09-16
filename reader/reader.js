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

var backbutton = document.getElementById("backtoarticle");

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

		if (window.isDarkMode) {
			rframe.contentDocument.body.classList.add("dark-mode");
		}

		requestAnimationFrame(function () {
			rframe.height = rframe.contentDocument.body.querySelector(".reader-main").scrollHeight + "px";
			requestAnimationFrame(function () {
				rframe.focus(); //allows spacebar page down and arrow keys to work correctly
			});
		});
	}

	//save the scroll position at intervals

	setInterval(function () {
		updateExtraData(url, {
			scrollPosition: window.pageYOffset,
			articleScrollLength: rframe.contentDocument.body.scrollHeight,
		});
	}, 10000);

	document.body.appendChild(rframe);

	backbutton.addEventListener("click", function (e) {
		window.location = url;
	});

}

//iframe hack to securely parse the document

var url = getQueryVariable("url");

document.title = "Reader View | " + url

var parserframe = document.createElement("iframe");
parserframe.className = "temporary-iframe";
parserframe.sandbox = "allow-same-origin";
document.body.appendChild(parserframe);

function processArticle(data) {

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

		/* site-specific workarounds */

		//needed for wikipedia.org

		var images = doc.querySelectorAll("img")

		for (var i = 0; i < images.length; i++) {
			if (images[i].src && images[i].srcset) {
				images[i].srcset = "";
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

		saveArticle(url, data, article, {
			scrollPosition: 0,
			articleScrollLength: null,
		});
	}

}

fetch(url, {
		credentials: "include",
	})
	.then(function (response) {
		return response.text();
	})
	.then(processArticle)
	.catch(function (data) {
		console.warn("request failed with error", data);

		getArticle(url, function (item) {
			if (item) {
				console.log("offline article found, displaying");
				startReaderView(item.article);
			} else {
				startReaderView({
					content: "<em>Failed to load article.</em>"
				});
			}
		});
	});
