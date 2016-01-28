var readerView = {
	readerURL: "file://" + __dirname + "/reader/index.html",
	getButton: function (tabId) {
		//TODO better icon
		var item = document.createElement("i");
		item.className = "fa fa-align-left reader-button";

		item.setAttribute("data-tab", tabId);
		item.setAttribute("title", "Enter reader view");

		item.addEventListener("click", function (e) {
			var tabId = this.getAttribute("data-tab");
			var tab = tabs.get(tabId);

			e.stopPropagation();

			if (tab.isReaderView) {
				readerView.exit(tabId);
			} else {
				readerView.enter(tabId);
			}
		});

		return item;
	},
	updateButton: function (tabId) {
		var button = document.querySelector('.reader-button[data-tab="{id}"]'.replace("{id}", tabId));
		var tab = tabs.get(tabId);

		if (tab.isReaderView) {
			button.classList.add("is-reader");
			button.setAttribute("title", "Exit reader view");
			return;
		} else {
			button.classList.remove("is-reader");
			button.setAttribute("title", "Enter reader view");
		}

		if (tab.readerable) {
			button.classList.add("can-reader");
		} else {
			button.classList.remove("can-reader");
		}
	},
	enter: function (tabId) {
		navigate(tabId, readerView.readerURL + "?url=" + tabs.get(tabId).url);
		tabs.update(tabId, {
			isReaderView: true
		});
	},
	exit: function (tabId) {
		navigate(tabId, tabs.get(tabId).url.split("?url=")[1]);
		tabs.update(tabId, {
			isReaderView: false
		});
	},
	showReadingList: function (options) {
		if (performance.now() < 1000) { //history hasn't loaded yet
			return;
		}

		bookmarks.searchHistory(readerView.readerURL, function (data) {
			var cTime = Date.now();
			var oneWeekInMS = 7 * 24 * 60 * 60 * 1000;

			function calculateReadingListScore(article) {
				return article.lastVisit + (5000 * article.visitCount);
			}

			var articles = data.filter(function (item) {
				return item.url.indexOf(readerView.readerURL) == 0 && (cTime - item.lastVisit < oneWeekInMS || (cTime - item.lastVisit < oneWeekInMS * 3 && item.visitCount == 1))
			}).sort(function (a, b) {
				return calculateReadingListScore(b) - calculateReadingListScore(a);
			});

			if (options && options.limitResults) {
				articles = articles.slice(0, 4);
			}

			articles.forEach(function (article) {
				var item = createSearchbarItem({
					title: article.title,
					secondaryText: urlParser.prettyURL(article.url.replace(readerView.readerURL + "?url=", "")),
					url: article.url
				});

				item.addEventListener("click", function (e) {
					openURLFromsearchbar(e, article.url);
				});

				historyarea.appendChild(item);
			});

			if (options && options.limitResults) {

				var seeMoreLink = createSearchbarItem({
					title: "More articles",
				});

				seeMoreLink.style.opacity = 0.5;

				seeMoreLink.addEventListener("click", function (e) {
					clearsearchbar();
					readerView.showReadingList({
						limitResults: false
					});
				});

				historyarea.appendChild(seeMoreLink);
			}
		});
	},
}

//update the reader button on page load

bindWebviewEvent("did-finish-load", function (e) {
	var tab = this.getAttribute("data-tab"),
		url = this.getAttribute("src");

	if (url.indexOf(readerView.readerURL) == 0) {
		tabs.update(tab, {
			isReaderView: true,
			readerable: false, //assume the new page can't be readered, we'll get another message if it can
		})
	} else {
		tabs.update(tab, {
			isReaderView: false,
			readerable: false,
		})
	}

	readerView.updateButton(tab);

});

bindWebviewIPC("canReader", function (webview, tab) {
	tabs.update(tab, {
		readerable: true
	});
	readerView.updateButton(tab);
});
