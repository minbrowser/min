importScripts("../ext/Dexie.min.js");
importScripts("../ext/lunr.min.js");
importScripts("database.js");

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

		bookmarksIndex.add({
			id: bookmark.url,
			title: bookmark.title || "",
			body: bookmark.text || "",
			url: bookmark.url,
		});

		bookmarksInMemory[bookmark.url] = {
			url: bookmark.url,
			title: bookmark.title,
			//we skip the text property, since it takes up a lot of memory and isn't used anywhere
			extraData: bookmark.extraData
		};

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
