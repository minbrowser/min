var ipc = require('ipc');
var webFrame = require('web-frame');


/* start browser js */

/* send bookmarks data. Note that since this is defined in window, webpages can modify it - don't trust anything it sends to the main process. */

window._browser_sendData = function () {
	var candidates = ["P", "ARTICLE", "STORNG", "B", "I", "U", "H1", "H1", "H3", "A", "BUTTON", "PRE", "CODE"];
	var ignore = ["LINK", "STYLE", "SCRIPT"];
	var text = "";
	var pageElements = document.querySelectorAll("*");
	for (var i = 0; i < pageElements.length; i++) {

		var el = pageElements[i]
		if (candidates.indexOf(el.tagName) != -1 || (!el.childElementCount && ignore.indexOf(el.tagName) == -1)) {
			text += " " + el.textContent;
		}
	}

	//special meta tags

	var mt = document.querySelector("meta[name=description]");

	if (mt) {
		text += " " + mt.content;
	}

	text = text.replace(/[\n\t]/g, ""); //remove useless newlines/tabs that increase filesize

	/* also parse special metadata: price, rating, location */

	var price, rating, location;

	//pricing

	var priceEl = document.querySelector("[itemprop=price], .price, .offer-price, #priceblock_ourprice, .discounted-price");
	var currencyEl = document.querySelector("[itemprop=priceCurrency], [property=priceCurrency]");

	if (priceEl) {
		price = priceEl.textContent;
	}

	if (!/\d/g.test(price)) { //if the price doesn't contain a number, it probably isn't accurate
		price = undefined;
	}

	if (price && price.indexOf("$") == -1 && currencyEl) { //try to add a currency if we don't have one. We should probably check for other currencies, too.
		price = (currencyEl.content || currencyEl.textContent).replace("USD", "$") + price;
	}

	//ratings

	var ratingEl = document.querySelector('.star-img, [itemprop="ratingValue"], [property="ratingValue"]');

	if (!ratingEl) { //if we didn't find an element, try again with things that might be a rating element, but are less likely
		ratingEl = document.querySelector('[class^="rating"], [class^="review"]');
	}


	if (ratingEl) {
		rating = ratingEl.title || ratingEl.alt || ratingEl.content || ratingEl.textContent;
		rating = rating.replace("rating", "").replace("stars", "").replace("star", "").trim();
		console.log("r: " + rating);
		if (rating && /\d*/g.test(rating)) { //if the rating is just numbers, we assume it means "stars", and append the prefix
			rating = rating + " stars";
		}
	}

	//location

	var locationEl = document.querySelector('[itemprop="location"], [itemprop="address"]');

	if (!locationEl) {
		var locationEl = document.querySelector('.adr, .addr, .address');
	}

	if (locationEl) {
		location = locationEl.textContent.trim();
	}

	//remove US postcodes, since these usually aren't important and they take up space
	//TODO make this work for other countries
	if (location && /,?\d{5}$/g.test(location)) {
		location = location.replace(/,?\d{5}$/g, "");
	}


	console.log("rating: " + rating);
	console.log("price: " + price);
	console.log("location: " + location);

	ipc.sendToHost("bookmarksData", {
		url: window.location.toString(),
		title: document.title || "",
		text: text,
		extraData: {
			metadata: {
				price: price,
				rating: rating,
				location: location,
			}
		}
	});
}

/* contextmenu */

/*window.addEventListener("contextmenu", function (e) {
	e.preventDefault();
	ipc.sendToHost("openContextmenu", {
		x: e.x,
		y: e.y,
	});
}); */

/* browser zoom - messages sent in menu.js */

window._browser_zoomLevel = 0;
window._browser_maxZoom = 9;
window._browser_minZoom = -8;

ipc.on("zoomIn", function () {
	if (_browser_maxZoom > _browser_zoomLevel) {
		_browser_zoomLevel += 1;
	}
	webFrame.setZoomLevel(_browser_zoomLevel);
});


ipc.on("zoomOut", function () {
	if (_browser_minZoom < _browser_zoomLevel) {
		_browser_zoomLevel -= 1;
	}
	webFrame.setZoomLevel(_browser_zoomLevel);
});


ipc.on("zoomReset", function () {
	_browser_zoomLevel = 0;
	webFrame.setZoomLevel(_browser_zoomLevel);
});

/* back/forward swipe - needs to be fast (no ipc), so in here */

var totalMouseMove = 0;
window.documentUnloaded = false;

window.addEventListener("mousewheel", function (e) {
	if (e.deltaY > 7 || e.deltaY < -7) {
		return;
	}

	if (!documentUnloaded) {

		totalMouseMove += e.deltaX


		if (totalMouseMove < -150) {
			doneNavigating = true;
			window.history.back();
			documentUnloaded = true;
			console.log("going back");
			setTimeout(function () {
				documentUnloaded = false;
			}, 3000);
		} else if (totalMouseMove > 100) {
			console.log("going forward");
			documentUnloaded = true;
			window.history.go(1);
			console.log(e);
			setTimeout(function () {
				documentUnloaded = false;
			}, 3000);
		}

	}
});

setInterval(function () {
	totalMouseMove = 0;
}, 4000);

/* reader view */

window.addEventListener("load", function (e) {
	var paragraphs = document.querySelectorAll("p");
	var tl = 0;
	if (!paragraphs) {
		return;
	}
	for (var i = 0; i < paragraphs.length; i++) {
		tl += Math.max(paragraphs[i].textContent.length - 100, -30);
	}
	window._browser_readerScore = tl;

	if (tl > 650 || (document.querySelector("article") && tl > 200)) {
		//the page is probably an article

		//some websites can cause multiple did-finish-load events. In webview.js, we assume these mean a new page, and set readerable to false. Because of this, if we send canReader, and later there is another load event, the button will never show up. To get around this, we send multiple canReader events at intervals.

		setTimeout(function () {
			ipc.sendToHost("canReader");
		}, 500);

		setTimeout(function () {
			ipc.sendToHost("canReader");
		}, 2500);

	}
});

/* gets page data used for the context menu */

ipc.on("getContextData", function (event) {

	var element = document.elementFromPoint(event.x, event.y);
	var src = element.src || element.href;

	if (element.tagName == "IMG" || element.tagName == "PICTURE") {
		var image = element.src;
	}

	ipc.sendToHost("contextData", {
		selection: window.getSelection().toString(),
		src: src,
		image: image,
	});
})
