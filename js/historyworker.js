console.log("worker started ", performance.now());

importScripts("../ext/Dexie.min.js");
importScripts("../node_modules/string_score/string_score.min.js");
importScripts("database.js");
console.log("scripts loaded ", performance.now());

//extraData key is an object - its so we don't have to upgrade the db if we want to add stuff in the future

var spacesRegex = /[\+\s._/-]/g; //things that could be considered spaces
var wordRegex = /^[a-z\s]+$/g;

function calculateHistoryScore(item, boost) { //boost - how much the score should be multiplied by. Example - 0.05
	var fs = item.lastVisit * (1 + 0.036 * Math.sqrt(item.visitCount));

	//bonus for short url's 
	if (item.url.length < 20) {
		fs += (30 - item.url.length) * 2500;
	}

	if (item.boost) {
		fs += fs * item.boost;
	}

	return fs;
}

var oneMonthInMS = 30 * 24 * 60 * 60 * 1000; //one month in milliseconds

//the oldest an item can be to remain in the database
var minItemAge = Date.now() - oneMonthInMS;

function cleanupHistoryDatabase() { //removes old history entries
	db.history.where("lastVisit").below(minItemAge).delete();
}

setTimeout(cleanupHistoryDatabase, 20000); //don't run immediately on startup, since is might slow down searchbar search.
setInterval(cleanupHistoryDatabase, 60 * 60 * 1000);

//cache history in memory for faster searching. This actually takes up very little space, so we can cache everything.

var historyInMemoryCache = [];

function loadHistoryInMemory() {
	historyInMemoryCache = [];

	db.history.each(function (item) {
		historyInMemoryCache.push(item);
	}).then(function () {
		//if we have enough matches during the search, we exit. In order for this to work, frequently visited sites have to come first in the cache.
		historyInMemoryCache.sort(function (a, b) {
			return calculateHistoryScore(b) - calculateHistoryScore(a);
		});
	});
};

loadHistoryInMemory();

setInterval(loadHistoryInMemory, 30 * 60 * 1000);

onmessage = function (e) {
	var action = e.data.action;
	var pageData = e.data.data;
	var searchText = e.data.text && e.data.text.toLowerCase();

	if (action == "updateHistory") {

		if (pageData.url == "about:blank" || pageData.url.indexOf("pages/phishing/index.html") != -1) { //these are useless
			return;
		}

		//if this entry existed previously, update it

		db.transaction("rw", db.history, function () {
				console.log("recieved page for history: " + pageData.url);

				var ct = db.history.where("url").equals(pageData.url).count(function (ct) {
					if (ct == 0) { //item doesn't exist, add it

						db.history
							.add({
								title: pageData.title || pageData.url,
								url: pageData.url,
								color: pageData.color,
								visitCount: 1,
								lastVisit: Date.now(),
							});

					} else { //item exists, query previous values and update
						db.history.where("url").equals(pageData.url).each(function (item) {

							db.history.where("url").equals(pageData.url).modify({
								visitCount: item.visitCount + 1,
								lastVisit: Date.now(),
								title: pageData.title || pageData.url, //the title and color might have changed - ex. if the site content was updated
								color: pageData.color,
							})
						});
					}
				});

			})
			.catch(function (err) {
				console.warn("failed to update history.");
				console.warn("page url was: " + pageData.url);
				console.error(err);
			});


	}

	if (action == "deleteHistory") {
		db.history.where("url").equals(pageData.url).delete();

		//delete from the in-memory cache
		for (var i = 0; i < historyInMemoryCache.length; i++) {
			if (historyInMemoryCache[i].url == pageData.url) {
				historyInMemoryCache.splice(i, 1);
			}
		}
	}

	if (action == "searchHistory") { //do a history search

		function processItem(item) {

			if (matches.length > 200) {
				return;
			}

			//if the text does not contain the first search word, it can't possibly be a match, so don't do any processing
			var itext = (item.url.split("?")[0].replace("http://", "").replace("https://", "").replace("www.", ""))

			if (item.url != item.title) {
				itext += " " + item.title;
			}

			itext = itext.toLowerCase().replace(spacesRegex, " ");

			var tindex = itext.indexOf(st);

			//if the url contains the search string, count as a match
			//prioritize matches near the beginning of the url
			if (tindex == 0) {
				item.boost = itemStartBoost; //large amount of boost for this
				matches.push(item);

			} else {

				if (tindex != -1) {
					item.boost = exactMatchBoost;
					matches.push(item);
					return;
				}

				if (substringSearchEnabled) {

					var substringMatch = true;

					//check if the search text matches but is out of order
					for (var i = 0; i < searchWords.length; i++) {
						if (itext.indexOf(searchWords[i]) == -1) {
							substringMatch = false;
							break;
						}
					}

					if (substringMatch) {
						item.boost = 0.125 * searchWords.length + (0.02 * stl);
						matches.push(item);
						return;
					}
				}

				//if all of the search words (split by spaces, etc) exist in the url, count it as a match, even if they are out of order

				var score = itext.replace(".com", "").replace(".net", "").replace(".org", "").score(st, 0);

				if (score > 0.4 + (0.001 * itext.length)) {
					item.boost = score;

					if (score > 0.62) {
						item.boost += 0.33;
					}

					matches.push(item);
				}

			}
		}

		if (!searchText) { //if there is no search text, we should just return top sites
			postMessage({
				result: historyInMemoryCache.slice(0, 100),
				scope: "history"
			});
			return;
		}


		var tstart = performance.now();
		var matches = [];
		var st = searchText.replace(spacesRegex, " ");
		var stl = searchText.length;
		var searchWords = searchText.split(spacesRegex);
		var substringSearchEnabled = false;
		var itemStartBoost = 2.5 * stl;
		var exactMatchBoost = 0.3 + (0.075 * stl);

		if (searchText.indexOf(" ") != -1) {
			substringSearchEnabled = true;
		}

		historyInMemoryCache.forEach(processItem);

		matches.sort(function (a, b) { //we have to re-sort to account for the boosts applied to the items
			return calculateHistoryScore(b) - calculateHistoryScore(a);
		});

		var tend = performance.now();

		console.info("history search took", tend - tstart);
		postMessage({
			result: matches.splice(0, 100),
			scope: "history"
		});
	}

}
