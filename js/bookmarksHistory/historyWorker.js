console.log("worker started ", performance.now());

importScripts("../../ext/Dexie.min.js");
importScripts("../../node_modules/string_score/string_score.min.js");
importScripts("../util/database.js");
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

var oneDayInMS = 24 * 60 * 60 * 1000; //one day in milliseconds

//the oldest an item can be to remain in the database
var minItemAge = Date.now() - (oneDayInMS * 42);

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

//calculates how similar two history items are

function calculateHistorySimilarity(a, b) {
	var score = 0;

	if (a.url.split("/")[2] == b.url.split("/")[2]) {
		score += 0.1;
	}

	var aWords = a.title.toLowerCase().split(spacesRegex);
	var bText = b.title.toLowerCase();
	var wm = 0;
	for (var i = 0; i < aWords.length; i++) {
		if (aWords[i].length > 2 && aWords[i] != "http" && aWords[i] != "https" && bText.indexOf(aWords[i]) != -1) {
			score += 0.0025 * aWords[i].length;
			wm++;
		}
	}

	if (wm > 1) {
		score += (0.05 * Math.pow(1.5, wm));
	}

	var vDiff = Math.abs(a.lastVisit - b.lastVisit);
	if (vDiff < 600000 && b.visitCount > 10) {
		score += 0.1 + (0.02 * Math.sqrt(a.visitCount)) + ((600000 - vDiff) * 0.0000025);
	}

	var diffPct = vDiff / a.visitCount;

	if (diffPct > 0.9 && diffPct < 1.1) {
		score += 0.15;
	}

	return score;
}

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

						var newItem = {
							title: pageData.title || pageData.url,
							url: pageData.url,
							color: pageData.color,
							visitCount: 1,
							lastVisit: Date.now(),
						}

						db.history.add(newItem);
						historyInMemoryCache.push(newItem);

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

			//if the text does not contain the first search word, it can't possibly be a match, so don't do any processing
			var itext = item.url.split("?")[0].replace("http://", "").replace("https://", "").replace("www.", "")

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

			} else if (tindex != -1) {
				item.boost = exactMatchBoost;
				matches.push(item);
			} else {

				//if all of the search words (split by spaces, etc) exist in the url, count it as a match, even if they are out of order

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

		if (!searchText) {

			//boost sites that have been visited at roughly the same time of day as the current time

			var cTime = new Date();
			var cTimeMS = cTime.getTime();

			var hours = cTime.getHours() + (cTime.getMinutes() / 60);

			function topSiteScore(item) {
				var dateObj = new Date(item.lastVisit);
				var time = dateObj.getHours() + (dateObj.getMinutes() / 60);
				var lastVisitTimeAgo = cTimeMS - dateObj.getTime();

				var diff = Math.abs(hours - time);

				item.boost = 0; //don't change the results based on previous history searches
				var score = calculateHistoryScore(item);

				if (diff < 0.33) {
					diff = 0.33;
				}

				if (diff < 2 && lastVisitTimeAgo > 300000 && lastVisitTimeAgo < 604800000 && item.visitCount > 2) { //604800000 is one week in ms
					score += score * (Math.pow(2 - diff, 2)) * 0.05;
				}

				if (diff < 1 && item.visitCount > 5 && lastVisitTimeAgo > 7200000) {
					score += score * 0.1;
				}


				return score;
			}

			var matches = historyInMemoryCache.slice(0, 100).sort(function (a, b) {
				return topSiteScore(b) - topSiteScore(a);
			});


			postMessage({
				result: matches.slice(0, 100),
				scope: "history"
			});
			return;
		}


		var tstart = performance.now();
		var matches = [];
		var st = searchText.replace(spacesRegex, " ");
		var stl = searchText.length;
		var searchWords = st.split(" ");
		var substringSearchEnabled = false;
		var itemStartBoost = 2.5 * stl;
		var exactMatchBoost = 0.3 + (0.075 * stl);

		if (searchText.indexOf(" ") != -1) {
			substringSearchEnabled = true;
		}

		for (var i = 0; i < historyInMemoryCache.length; i++) {
			if (matches.length > 200) {
				break;
			}
			processItem(historyInMemoryCache[i]);
		}

		matches.sort(function (a, b) { //we have to re-sort to account for the boosts applied to the items
			return calculateHistoryScore(b) - calculateHistoryScore(a);
		});

		var tend = performance.now();

		console.info("history search took", tend - tstart);
		postMessage({
			result: matches.slice(0, 100),
			scope: "history"
		});
	}

	if (action == "getHistorySuggestions") {
		//get the history item for the provided url

		var baseItem = null;

		for (var i = 0; i < historyInMemoryCache.length; i++) {
			if (historyInMemoryCache[i].url == searchText) {
				baseItem = historyInMemoryCache[i];
				break;
			}
		}

		//use a default item. This could occur if the given url is for a page that has never finished loading
		if (!baseItem) {
			baseItem = {
				url: searchText,
				title: "",
				lastVisit: Date.now(),
				visitCount: 1,
			}
		}

		var results = historyInMemoryCache.slice();

		var cTime = Date.now();

		for (var i = 0; i < results.length; i++) {

			if (cTime - results[i].lastVisit > 604800000) {
				results[i].boost = 0;
			} else {
				results[i].boost = calculateHistorySimilarity(baseItem, results[i]) * 1.2;

				if (cTime - results[i].lastVisit < 60000) {
					results[i].boost -= 0.1;
				}
			}

			results[i].hScore = calculateHistoryScore(results[i]);
		}

		var results = results.sort(function (a, b) {
			return b.hScore - a.hScore;
		});

		postMessage({
			result: results.slice(0, 100),
			scope: "history",
		});
	}
}
