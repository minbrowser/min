importScripts("../../ext/Dexie.min.js");
importScripts("../../node_modules/lunr/lunr.min.js");
importScripts("../util/database.js");

//add bookmarks to the lunr index
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
	/* format is url: bookmarkObject */
}

db.bookmarks
	.each(function (bookmark) {

		var t1 = performance.now();

		bookmarksIndex.add({
			id: bookmark.url,
			title: bookmark.title || "",
			body: bookmark.text || "",
			url: bookmark.url,
		});

		var t2 = performance.now();

		/*if (t2 - t1 > 400) {
			console.info("bookmark is slow", bookmark, bookmark.text.length);
		}*/

		bookmarksInMemory[bookmark.url] = {
			url: bookmark.url,
			title: bookmark.title,
			//we skip the text property, since it takes up a lot of memory and isn't used anywhere
			extraData: bookmark.extraData
		};

	}).then(function () {
		console.log("bookmarks loaded in " + performance.now() + " ms");
	});


onmessage = function (e) {
	var action = e.data.action;
	var pageData = e.data.data;
	var searchText = e.data.text && e.data.text.toLowerCase();

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

		bookmarksInMemory[pageData.url] = {
			url: pageData.url,
			title: pageData.title,
			//we skip the text property, since it takes up a lot of memory and isn't used anywhere
			extraData: pageData.extraData
		};
	}

	if (action == "deleteBookmark") {
		db.bookmarks.where("url").equals(pageData.url).delete();

		delete bookmarksInMemory[pageData.url];
	}


	if (action == "searchBookmarks") { //do a bookmarks search

		if (!searchText) {

			//convert object to array
			var results = [];

			for (var url in bookmarksInMemory) {
				results.push(bookmarksInMemory[url]);
			}
			postMessage({
				result: results,
				scope: "bookmarks",
				callback: e.data.callbackId,
			});
			return;
		}

		if (searchText.indexOf(" ") == -1) { //if there is only one word, don't do a full-text search
			var results = [];
			for (var url in bookmarksInMemory) {
				if ((bookmarksInMemory[url].title + bookmarksInMemory[url].url).toLowerCase().indexOf(searchText.toLowerCase()) != -1) {
					bookmarksInMemory[url].score = 1;
					results.push(bookmarksInMemory[url]);
				}
			}
		} else {

			var results = bookmarksIndex.search(searchText);

			//return 5, sorted by relevancy


			results = results.sort(function (a, b) {
				return b.score - a.score
			}).splice(0, 5);

			//change data format

			for (var i = 0; i < results.length; i++) {
				var url = results[i].ref;

				//the item has been deleted
				if (!bookmarksInMemory[url]) {
					delete results[i];
					continue;
				}

				bookmarksInMemory[url].score = results[i].score;
				results[i] = bookmarksInMemory[url];
			}
		}

		postMessage({
			result: results,
			scope: "bookmarks",
			callback: e.data.callbackId,
		}); //send back to bookmarks.js
	}
}
