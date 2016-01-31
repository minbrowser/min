/* send bookmarks data.  */

function getBookmarksText(doc, win) {

	var docClone = doc.cloneNode(doc, true);

	var ignoredElements = docClone.body.querySelectorAll('link, style, script, noscript, .visually-hidden, .visuallyhidden, [role=presentation], [hidden], [style*="display:none"], .ad, .dialog, .modal');

	if (ignoredElements) {
		for (var i = 0; i < ignoredElements.length; i++) {
			ignoredElements[i].parentNode.removeChild(ignoredElements[i]);
		}
	}

	var ignoreIfMinor = docClone.body.querySelectorAll("aside, .sidebar, #sidebar");

	if (ignoreIfMinor) {
		for (var i = 0; i < ignoreIfMinor.length; i++) {
			if (ignoreIfMinor[i].textContent.length / docClone.body.textContent.length < 0.075) {
				ignoreIfMinor[i].parentNode.removeChild(ignoreIfMinor[i]);
			}
		}
	}

	var pageElements = docClone.body.querySelectorAll("*");
	var text = "";

	for (var i = 0; i < pageElements.length; i++) {
		pageElements[i].insertAdjacentHTML("beforeend", " ");
	};

	text = docClone.body.textContent;

	//special meta tags

	var mt = docClone.querySelector("meta[name=description]");

	if (mt) {
		text += " " + mt.content;
	}

	text = text.replace(/[\n\t]/g, ""); //remove useless newlines/tabs that increase filesize

	text = text.replace(/\s{2,}/g, " "); //collapse multiple spaces into one
	text = text.replace(/<.*?>/g, "");

	return text;
}

ipc.on("sendData", function () {

	/* also parse special metadata: price, rating, location, cooking time */

	var price, rating, location, cookTime;

	//pricing

	var priceEl = document.querySelector("[itemprop=price], .price, .offer-price, #priceblock_ourprice, .discounted-price");
	var currencyEl = document.querySelector("[itemprop=priceCurrency], [property=priceCurrency]");

	if (priceEl) {
		price = priceEl.textContent;
	}

	if (!/\d/g.test(price)) { //if the price doesn't contain a number, it probably isn't accurate
		price = undefined;
	}

	if (price && price.indexOf("$") == -1 && currencyEl && navigator.language == "en-US") { //try to add a currency if we don't have one. We should probably check for other currencies, too.
		price = (currencyEl.content || currencyEl.textContent).replace("USD", "$") + price;
	}

	//ratings

	var ratingEl = document.querySelector('.star-img, .rating, [itemprop="ratingValue"], [property="ratingValue"]');

	if (!ratingEl) { //if we didn't find an element, try again with things that might be a rating element, but are less likely
		ratingEl = document.querySelector('[class^="rating"], [class^="review"]');
	}


	if (ratingEl) {
		rating = ratingEl.title || ratingEl.alt || ratingEl.content || ratingEl.textContent;
		rating = rating.replace("rating", "").replace("stars", "").replace("star", "").trim();
		console.log("r: " + rating);
		if (rating && /\d+$/g.test(rating)) { //if the rating ends in a number, we assume it means "stars", and append the prefix
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

	//cooking time

	var cookingTimeEl = document.querySelector('[itemprop="totalTime"], [itemprop="cookTime"]');

	if (cookingTimeEl) {
		cookTime = cookingTimeEl.textContent;
		cookTime = cookTime.replace(/\sm$/g, " minutes").replace(/\sh$/g, " hours");
		cookTime = cookTime.replace("1 hours", "1 hour");
	}


	console.log("rating: " + rating);
	console.log("price: " + price);
	console.log("location: " + location);

	var text = getBookmarksText(document, window);

	//try to also extract text for same-origin iframes (such as the reader mode frame)

	var frames = document.querySelectorAll("iframe");

	for (var x = 0; x < frames.length; frames++) {
		try {
			text += ". " + getBookmarksText(frames[x].contentDocument, frames[x].contentWindow);
		} catch (e) {}
	}


	ipc.sendToHost("bookmarksData", {
		url: window.location.toString(),
		title: document.title || "",
		text: text,
		extraData: {
			metadata: {
				price: price,
				rating: rating,
				location: location,
				cookTime: cookTime,
			}
		}
	});
});
