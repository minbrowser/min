console.log("worker started ", performance.now());

importScripts("../ext/Dexie.min.js");
importScripts("../node_modules/string_score/string_score.min.js");
importScripts("database.js");
console.log("scripts loaded ", performance.now());

var topics = []; //a list of common groups of history items. Each one is an object with: score (number), name (string), and urls (array).

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

setTimeout(cleanupHistoryDatabase, 20000); //don't run immediately on startup, since is might slow down awesomebar search.
setInterval(cleanupHistoryDatabase, 60 * 60 * 1000);

/* generate topics */


function generateTopics() {
	var bundles = {};
	var inc, totalString;
	//split history items into a list of words and the pages that contain them
	db.history.each(function (item) {

			var itemWords = item.title.split(spacesRegex);

			for (var x = 0; x < itemWords.length; x++) {

				if (itemWords[x].length < 3 || itemWords[x] == "com") {
					continue;
				}

				itemWords[x] = itemWords[x].toLowerCase().trim();

				if (bundles[itemWords[x]]) {
					bundles[itemWords[x]].push(item);
				} else {
					bundles[itemWords[x]] = [item]
				}

				//try to generate longer strings if possible

				inc = x + 1;
				totalString = itemWords[x];

				while (itemWords[inc]) {
					if (itemWords[inc].length < 3 || itemWords[inc] == "com") {
						break;
					}
					totalString += " " + itemWords[inc].toLowerCase().trim();

					if (bundles[totalString]) {
						bundles[totalString].push(item);
					} else {
						bundles[totalString] = [item]
					}

					inc++;
				}
			}

		})
		.then(function () {
			//cleanup the words list to only select bundles that actually have a good chance of being relevant

			for (var item in bundles) {
				wordRegex.lastIndex = 0; //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex
				var key = item + "";
				if (bundles[item].length < 4 || !wordRegex.test(key) || item.length < 4) { //not a word, or not enough url's, or name is too short
					delete bundles[item];
					continue;
				}

				//calculate the total score of the bundle

				var totalScore = 0;

				bundles[item].forEach(function (historyObject) {
					totalScore += calculateHistoryScore(historyObject);
				});

				//convert history items from object to a url string - we can always query the history database later if we need the extra data

				var urlSet = bundles[item].map(function (item) {
					return item.url;
				});


				var newObj = {
					urls: urlSet.splice(0, 45), //put a bound on the items returned
					score: totalScore - (totalScore * 0.02 * Math.abs(12 - item.length)),
				}

				bundles[item] = newObj;
			}

			for (var key in bundles) {
				bundles[key].name = key;
				topics.push(bundles[key]);
			}

			topics.sort(function (a, b) {
				return b.score - a.score;
			});

			console.info("bundles generated");

		})
		.catch(function (e) {
			console.warn("error generating bundles");
			console.error(e);
		})
}

setTimeout(generateTopics, 30000);


//cache frequently visited sites in memory for faster searching

var historyInMemoryCache = [];
var doneLoadingCache = false;

function loadHistoryInMemory() {
	historyInMemoryCache = [];
	doneLoadingCache = false;

	db.history.where("visitCount").above(40).each(function (item) {
		historyInMemoryCache.push(item);
	}).then(function () {
		db.history.where("visitCount").between(3, 40).each(function (item) {
			historyInMemoryCache.push(item);
		}).then(function () {
			doneLoadingCache = true
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
								title: pageData.title,
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
								title: pageData.title, //the title and color might have changed - ex. if the site content was updated
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

			if (matches.length > 500 && isSearchingMemory) {
				return;
			}

			//if the text does not contain the first search word, it can't possibly be a match, so don't do any processing
			var itext = (item.url.replace("http://", "").replace("https://", "").replace("www.", "") + " " + item.title).toLowerCase(); //TODO this is kind of messy

			var tindex = itext.indexOf(searchText);

			//if the url contains the search string, count as a match
			//prioritize matches near the beginning of the url
			if (tindex == 0) {
				item.boost = itemStartBoost; //large amount of boost for this
				matches.push(item);

			} else {

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
						item.boost = 0.1;
						matches.push(item);
						return;
					}
				}

				//if all of the search words (split by spaces, etc) exist in the url, count it as a match, even if they are out of order

				var score = itext.replace(".com", "").replace(".net", "").replace(".org", "").score(searchText, 0.0001);

				if (tindex != -1) {
					item.boost = score + exactMatchBoost;
					matches.push(item);
					return;
				}

				if (score > 0.43) {
					item.boost = score;
					matches.push(item);
				}

			}
		}

		function done() {
			matches.sort(function (a, b) {
				return calculateHistoryScore(b) - calculateHistoryScore(a);
			});
			var tend = performance.now();
			console.info("history search took", tend - tstart);
			postMessage({
				result: matches.splice(0, 100),
				scope: "history"
			});
		}
		var tstart = performance.now();
		var matches = [];
		var stl = searchText.length;
		var searchWords = searchText.split(spacesRegex);
		var isSearchingMemory = true;
		var substringSearchEnabled = false;
		var itemStartBoost = 2.5 * stl;
		var exactMatchBoost = 0.2 + (0.05 * stl);

		if (searchText.indexOf(" ") != -1) {
			substringSearchEnabled = true;
		}

		//initially, we only search frequently visited sites, but we do a second search of all sites if we don't find any results

		if (stl < 20) {
			historyInMemoryCache.forEach(processItem);

			if (matches.length > 10 || !doneLoadingCache) {
				done();
			} else {
				isSearchingMemory = false;
				//we didn't find enough matches, search all the items
				db.history.where("visitCount").below(4).each(processItem).then(done);
			}

		} else {
			db.history.each(processItem).then(done);
		}
	}



	if (action == "searchTopics") {

		var matches = [];

		//topics are already sorted

		for (var i = 0; i < topics.length; i++) {
			if (topics[i] && topics[i].name.indexOf(searchText) == 0) {
				matches.push(topics[i]);
			}
		}

		postMessage({
			result: matches.splice(0, 25),
			scope: "topics",
			callback: e.data.callbackId,
		});
	}
}
