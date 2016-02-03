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
		setTimeout(function () { //this prevents pages that are immediately left from being saved to history, and also gives the page-favicon-updated event time to fire (so the colors saved to history are correct).
			var tab = tabs.get(tabId);
			if (tab) {
				var data = {
					url: tab.url,
					title: tab.title,
					color: tab.backgroundColor,
				}
				bookmarks.historyWorker.postMessage({
					action: "updateHistory",
					data: data
				});
			}

		}, 500);
	},
	currentCallback: function () {},
	onDataRecieved: function (data) {
		//we can't trust that the data we get from webview_preload.js isn't malicious. Because of this, when we call bookmarks.bookmark(), we set authBookmarkTab to the bookmarked tab id. Then, we check if the url we get back actually matches the url of the tabtab we want to bookmark. This way, we know that the user actually wants to bookmark this url.
		if (!bookmarks.authBookmarkTab || getWebview(bookmarks.authBookmarkTab).getURL() != data.url) {
			throw new Error("Bookmark operation is unauthoritized.");
		}

		data.title = getWebview(bookmarks.authBookmarkTab).getTitle();
		bookmarks.bookmarksWorker.postMessage({
			action: "addBookmark",
			data: data
		})
		bookmarks.authBookmarkTab = null;
	},
	deleteBookmark: function (url) {
		bookmarks.bookmarksWorker.postMessage({
			action: "deleteBookmark",
			data: {
				url: url
			}
		});
	},
	deleteHistory: function (url) {
		bookmarks.historyWorker.postMessage({
			action: "deleteHistory",
			data: {
				url: url
			}
		});
	},
	searchBookmarks: function (text, callback) {
		bookmarks.currentCallback = callback; //save for later, we run in onMessage
		bookmarks.bookmarksWorker.postMessage({
			action: "searchBookmarks",
			text: text,
		});
	},
	searchHistory: function (text, callback) {
		bookmarks.currentHistoryCallback = callback; //save for later, we run in onMessage
		bookmarks.historyWorker.postMessage({
			action: "searchHistory",
			text: text,
		});
	},
	getHistorySuggestions: function (url, callback) {
		bookmarks.currentHistoryCallback = callback;
		bookmarks.historyWorker.postMessage({
			action: "getHistorySuggestions",
			text: url,
		});
	},
	onMessage: function (e) { //assumes this is from a search operation
		if (e.data.scope == "bookmarks") {
			//TODO this (and the rest) should use unique callback id's
			bookmarks.currentCallback(e.data.result);
		} else if (e.data.scope == "history") { //history search
			bookmarks.currentHistoryCallback(e.data.result);
		}
	},
	bookmark: function (tabId) {

		bookmarks.authBookmarkTab = tabId;
		getWebview(tabId).send("sendData");
		//rest happens in onDataRecieved and worker
	},
	toggleBookmarked: function (tabId) { //toggles a bookmark. If it is bookmarked, delete the bookmark. Otherwise, add it.
		var url = tabs.get(tabId).url,
			exists = false;

		bookmarks.searchBookmarks(url, function (d) {

			d.forEach(function (item) {
				if (item.url == url) {
					exists = true;
				}
			});


			if (exists) {
				console.log("deleting bookmark " + tabs.get(tabId).url);
				bookmarks.deleteBookmark(tabs.get(tabId).url);
			} else {
				bookmarks.bookmark(tabId);
			}
		});
	},
	handleStarClick: function (star) {
		star.classList.toggle("fa-star");
		star.classList.toggle("fa-star-o");

		bookmarks.toggleBookmarked(star.getAttribute("data-tab"));
	},
	getStar: function (tabId) {
		var star = document.createElement("i");
		star.setAttribute("data-tab", tabId);
		star.className = "fa fa-star-o bookmarks-button theme-text-color"; //alternative icon is fa-bookmark

		star.addEventListener("click", function (e) {
			bookmarks.handleStarClick(e.target);
		});

		return bookmarks.renderStar(tabId, star);
	},
	renderStar: function (tabId, star) { //star is optional
		star = star || document.querySelector('.bookmarks-button[data-tab="{id}"]'.replace("{id}", tabId));

		var currentURL = tabs.get(tabId).url;

		if (!currentURL || currentURL == "about:blank") { //no url, can't be bookmarked
			star.hidden = true;
			return star;
		} else {
			star.hidden = false;
		}

		//check if the page is bookmarked or not, and update the star to match

		bookmarks.searchBookmarks(currentURL, function (results) {

			if (!results) {
				return;
			}

			var hasMatched = false;

			results.forEach(function (r) {
				if (r.url == currentURL) {
					hasMatched = true;
				}
			});

			if (hasMatched) {
				star.classList.remove("fa-star-o");
				star.classList.add("fa-star");
			} else {
				star.classList.remove("fa-star");
				star.classList.add("fa-star-o");
			}
		});
		return star;
	},
	init: function () {
		bookmarks.historyWorker = new Worker("js/bookmarkshistory/historyworker.js");
		bookmarks.historyWorker.onmessage = bookmarks.onMessage;

		bookmarks.bookmarksWorker = new Worker("js/bookmarkshistory/bookmarksworker.js");
		bookmarks.bookmarksWorker.onmessage = bookmarks.onMessage;
	},

}

bookmarks.init();
