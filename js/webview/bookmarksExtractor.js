/* send bookmarks data.  */

ipc.on("sendData", function () {
	var candidates = ["P", "B", "I", "U", "H1", "H2", "H3", "A", "PRE", "CODE", "SPAN"];
	var ignore = ["LINK", "STYLE", "SCRIPT", "NOSCRIPT"];
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
});
