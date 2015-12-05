console.log("worker started ", performance.now());

importScripts("../ext/Dexie.min.js");
importScripts("../ext/lunr.min.js");
importScripts("../node_modules/string_score/string_score.min.js");
importScripts("database.js");

console.log("scripts loaded ", performance.now());

var topics = []; //a list of common groups of history items. Each one is an object with: score (number), name (string), and urls (array).

//extraData key is an object - its so we don't have to upgrade the db if we want to add stuff in the future

var spacesRegex = /[\+\s._/-]/g; //things that could be considered spaces
var wordRegex = /^[a-z\s]+$/g;

function getTime() {
	return new Date().getTime();
}

function calculateHistoryScore(item, boost) { //boost - how much the score should be multiplied by. Example - 0.05
	var fs = item.lastVisit * (1 + 0.022 * Math.sqrt(item.visitCount));

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

			//convert bundles from an array into an object

			var bundlesArray = [];

			for (var key in bundles) {
				bundles[key].name = key;
				bundlesArray.push(bundles[key]);
			}

			bundlesArray.sort(function (a, b) {
				return b.score - a.score;
			});

			//save to global variable

			topics = bundlesArray;

			console.info("bundles generated");

		})
		.catch(function (e) {
			console.warn("error generating bundles");
			console.error(e);
		})
}

generateTopics();

//index previously created items

var bookmarksIndex = lunr(function () {
	this.field('title', {
		boost: 5
	})
	this.field("body");
	this.field("url", {
		boost: 1
	})
	this.ref("id"); //url's are used as references
});

/* used to turn refs into bookmarks */

var bookmarksInMemory = {
	/* format is url: bookmark */
}

db.bookmarks
	.each(function (bookmark) {

		bookmarksIndex.add({
			id: bookmark.url,
			title: bookmark.title || "",
			body: bookmark.text || "",
			url: bookmark.url,
		});

		bookmarksInMemory[bookmark.url] = bookmark;

	});

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
								lastVisit: getTime(),
							});

					} else { //item exists, query previous values and update
						db.history.where("url").equals(pageData.url).each(function (item) {
							var visitCount = item.visitCount + 1;
							var lastVisit = getTime();

							db.history.where("url").equals(pageData.url).modify({
								visitCount: visitCount,
								lastVisit: lastVisit,
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

	if (action == "searchHistory") { //do a history search

		function processItem(item) {

			//if the text does not contain the first search word, it can't possibly be a match, so don't do any processing
			var itext = (item.url.replace("http://", "").replace("https://", "").replace("www.", "") + " " + item.title.substring(0, 50)).toLowerCase(); //TODO this is kind of messy

			var tindex = itext.indexOf(searchText);

			//if the url contains the search string, count as a match
			//prioritize matches near the beginning of the url
			if (tindex != -1 && tindex < 3) {
				item.boost = (3 - (0.02 * (tindex))) * stl; //large amount of boost for this

				matches.push(item);

			} else {

				//if all of the search words (split by spaces, etc) exist in the url, count it as a match, even if they are out of order

				var score = itext.replace(".com", "").replace(".net", "").replace(".org", "").score(searchText, 0.0001);

				if (tindex != -1 || score > 0.42) {

					//if we didn't return from the loop, the item matches

					item.boost = score * 1.1;

					if (tindex != -1) {
						item.boost += 0.3 + (0.03 * stl);
					}

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

		//initially, we only search frequently visited sites, but we do a second search of all sites if we don't find any results

		if (stl < 12) {
			db.history.where("visitCount").above(5).each(processItem)
				.then(function () {
					if (matches.length > 15) {
						done();
					} else {
						//we didn't find enough matches, search all the items
						db.history.where("visitCount").below(5).each(processItem).then(done);
					}
				});
		} else { //if the search text is long, we're unlikely to find enough with the top sites query, skip right to the main query
			db.history.each(processItem).then(done);
		}
	}

	if (action == "addBookmark") {

		db.bookmarks
			.add({
				url: pageData.url,
				title: pageData.title,
				text: pageData.text,
				extraData: pageData.extraData,
			});

		bookmarksIndex.add({
			id: pageData.url,
			title: pageData.title || "",
			body: pageData.text || "",
			url: pageData.url,
		});

		bookmarksInMemory[pageData.url] = pageData;
	}

	if (action == "deleteBookmark") {
		db.bookmarks.where("url").equals(pageData.url).delete();

		//mark the item as deleted, since lunr doesn't let us actually remove it from the index

		bookmarksInMemory[pageData.url].deleted = true;
	}


	if (action == "searchBookmarks") { //do a bookmarks search
		var result = bookmarksIndex.search(searchText);

		//return 5, sorted by relevancy


		result = result.sort(function (a, b) {
			return b.score - a.score
		}).splice(0, 5);

		//change data format

		for (var item in result) {
			var url = result[item].ref;
			bookmarksInMemory[url].score = result[item].score;

			//increase score for exact matches, since lunr doesn't do this correctly
			if (bookmarksInMemory[url].text.indexOf(searchText) != -1) {
				bookmarksInMemory[url].score *= 1 + (0.005 * searchText.length);
			}

			result[item] = bookmarksInMemory[url];
			if (result[item].deleted) {
				delete result[item]
			}
		}
		postMessage({
			result: result,
			scope: "bookmarks",
			callback: e.data.callbackId,
		}); //send back to bookmarks.js
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
