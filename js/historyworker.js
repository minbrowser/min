importScripts("../ext/Dexie.min.js");
importScripts("../ext/lunr.min.js");

var db = new Dexie('browsingData');

//extraData key is an object - its so we don't have to upgrade the db if we want to add stuff in the future

db.version(1)
	.stores({
		bookmarks: 'url, title, text, extraData', //url must come first so it is the primary key
		history: 'url, title, color, visitCount, lastVisit, extraData' //same thing
	});

db.open();

console.log("database opened");

var spacesRegex = /[\s._/-]/g; //things that could be considered spaces

function getTime() {
	return new Date().getTime();
}

var oneMonthInMS = 30 * 24 * 60 * 60 * 1000; //one month in milliseconds

function cleanupHistoryDatabase() { //removes old history entries
	var time = getTime();
	db.history.each(function (item) {
		if (time - item.lastVisit > oneMonthInMS) { //item is more than one month old, delete the item to prevent the db from getting too big
			db.history.where("url").equals(item.url).delete();
		}
	});
}

setTimeout(cleanupHistoryDatabase, 20000); //don't run immediately on startup, since is might slow down awesomebar search.

//index previously created items

var bookmarksIndex = lunr(function () {
	this.field('title', {
		boost: 10
	})
	this.field("body");
	this.field("url", {
		boost: 8
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
	var searchText = e.data.text;

	if (action == "updateHistory") {

		//if this entry existed previously, update it

		db.transaction("rw", db.history, function () {
				console.log("recieved page for history: " + pageData.url);

				var ct = db.history.where("url").equals(pageData.url).count(function (ct) {
					console.log("count for url " + pageData.url + " was " + ct);
					if (ct == 0) { //item doesn't exist, add it

						db.history
							.add({
								title: pageData.title,
								url: pageData.url,
								color: pageData.color,
								visitCount: 1,
								lastVisit: getTime(),
							});

						console.log("finished adding url: " + pageData.url);

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
		var matches = [];
		var searchWords = searchText.toLowerCase().split(spacesRegex);

		db.history.each(function (item) {
				if (item.url.indexOf(searchText) != -1) {
					matches.push(item);
				} else {
					var doesMatch = true;
					var itemWords = (item.url + item.title).toLowerCase().replace(spacesRegex, "").toString();

					for (var i = 0; i < searchWords.length; i++) {
						if (itemWords.indexOf(searchWords[i]) == -1) {
							doesMatch = false;
							break;
						}
					}
					if (doesMatch) {
						matches.push(item);
					}
				}
			})
			.then(function () {
				matches.sort(function (a, b) {
					return b.lastVisit * (1 + 0.0525 * b.visitCount) - a.lastVisit * (1 + 0.0525 * a.visitCount);
				});
				postMessage({
					result: matches,
					scope: "history"
				})
			});
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
}
