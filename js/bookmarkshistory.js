/*
steps to creating a bookmark:

 - bookmarks.bookmark(tabId) is called
 - webview_preload.js sends an ipc to webviews.js
 - webviews.js detects the channel is "bookmarksData", and calls bookmarks.onDataRecieved(data)
 - The worker creates a bookmark, and adds it to the search index

*/

var bookmarks = {
	authBookmarkTab: null,
	updateHistory: function (tabId) {
		var w = getWebview(tabId)[0]
		var data = {
			url: w.getURL(),
			title: w.getTitle(),
			color: tabs.get(tabId).backgroundColor
		}
		bookmarks.worker.postMessage({
			action: "updateHistory",
			data: data
		})
	},
	currentCallback: function () {},
	onDataRecieved: function (data) {
		//we can't trust that the data we get from webview_preload.js isn't malicious. Because of this, when we call bookmarks.bookmark(), we set authBookmarkTab to the bookmarked tab id. Then, we check if the url we get back actually matches the url of the tabtab we want to bookmark. This way, we know that the user actually wants to bookmark this url.
		if (!bookmarks.authBookmarkTab || getWebview(bookmarks.authBookmarkTab)[0].getURL() != data.url) {
			throw new Error("Bookmark operation is unauthoritized.");
		}

		data.title = getWebview(bookmarks.authBookmarkTab)[0].getTitle();
		bookmarks.worker.postMessage({
			action: "addBookmark",
			data: data
		})
		bookmarks.authBookmarkTab = null;
	},
	delete: function (url) {
		bookmarks.worker.postMessage({
			action: "deleteBookmark",
			data: {
				url: url
			}
		});
	},
	search: function (text, callback) {
		bookmarks.currentCallback = callback; //save for later, we run in onMessage
		bookmarks.worker.postMessage({
			action: "searchBookmarks",
			text: text,
		});
	},
	searchHistory: function (text, callback) {
		bookmarks.currentHistoryCallback = callback; //save for later, we run in onMessage
		bookmarks.worker.postMessage({
			action: "searchHistory",
			text: text,
		});
	},
	searchTopics: function (text, callback) {
		bookmarks.currentTopicsCallback = callback;
		bookmarks.worker.postMessage({
			action: "searchTopics",
			text: text,
		});
	},
	onMessage: function (e) { //assumes this is from a search operation
		if (e.data.scope == "bookmarks") {
			//TODO this (and the rest) should use unique callback id's
			bookmarks.currentCallback(e.data.result);
		} else if (e.data.scope == "history") { //history search
			bookmarks.currentHistoryCallback(e.data.result);
		} else if (e.data.scope == "topics") {
			bookmarks.currentTopicsCallback(e.data.result);
		}
	},
	bookmark: function (tabId) {

		bookmarks.authBookmarkTab = tabId;
		getWebview(tabId)[0].send("sendData");
		//rest happens in onDataRecieved and worker
	},
	toggleBookmarked: function (tabId) { //toggles a bookmark. If it is bookmarked, delete the bookmark. Otherwise, add it.
		var url = tabs.get(tabId).url,
			exists = false;

		bookmarks.search(url, function (d) {

			d.forEach(function (item) {
				if (item.url == url) {
					exists = true;
				}
			});


			if (exists) {
				console.log("deleting bookmark " + tabs.get(tabId).url);
				bookmarks.delete(tabs.get(tabId).url);
			} else {
				bookmarks.bookmark(tabId);
			}
		});
	},
	getStar: function (tabId) {
		//alternative icon is fa-bookmark

		var star = $("<i class='fa fa-star-o bookmarks-button theme-text-color'>").attr("data-tab", tabId);

		star.on("click", function (e) {
			$(this).toggleClass("fa-star").toggleClass("fa-star-o");

			bookmarks.toggleBookmarked($(this).attr("data-tab"));
		});

		return bookmarks.renderStar(tabId, star);
	},
	renderStar: function (tabId, star) { //star is optional
		star = star || $(".bookmarks-button[data-tab={id}]".replace("{id}", tabId));

		try {
			var currentURL = getWebview(tabId)[0].getURL();
		} catch (e) {
			var currentURL = tabs.get(tabId).url;
		}

		if (!currentURL || currentURL == "about:blank") { //no url, can't be bookmarked
			star.prop("hidden", true);
		} else {
			star.prop("hidden", false);
		}

		//check if the page is bookmarked or not, and update the star to match

		bookmarks.search(currentURL, function (results) {
			if (results && results[0] && results[0].url == currentURL) {
				star.removeClass("fa-star-o").addClass("fa-star");
			} else {
				star.removeClass("fa-star").addClass("fa-star-o");
			}
		});
		return star;
	},
	init: function () {
		bookmarks.worker = new Worker("js/historyworker.js");
		bookmarks.worker.onmessage = bookmarks.onMessage;
	},

}

bookmarks.init();
