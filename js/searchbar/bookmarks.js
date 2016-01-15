var bookmarkarea = searchbar.querySelector(".bookmark-results");

function addBookmarkItem(result) {
	//create the basic item
	//getRealTitle is defined in searchbar.js

	var item = createSearchbarItem({
		icon: "fa-star",
		title: getRealTitle(result.title),
		secondaryText: urlParser.prettyURL(result.url),
		url: result.url
	});

	item.addEventListener("click", function (e) {
		openURLFromsearchbar(e, result.url);
	});

	if (result.extraData && result.extraData.metadata) {

		var secondaryText = item.querySelector(".secondary-text");

		for (var md in result.extraData.metadata) {
			var span = document.createElement("span");

			span.className = "md-info";
			span.textContent = result.extraData.metadata[md];

			secondaryText.insertBefore(span, secondaryText.firstChild)
		}

	}

	bookmarkarea.appendChild(item);
}

var showBookmarkResults = debounce(function (text) {
	if (text.length < 5 || text.indexOf("!") == 0) { //if there is not enough text, or we're doing a bang search, don't show results
		limitHistoryResults(5);
		empty(bookmarkarea);
		return;
	}

	bookmarks.searchBookmarks(text, function (results) {
		empty(bookmarkarea);
		var resultsShown = 1;
		results.splice(0, 2).forEach(function (result) {
			//as more results are added, the threshold for adding another one gets higher
			if (result.score > Math.max(0.0004, 0.0016 - (0.00012 * Math.pow(1.25, text.length))) && (resultsShown == 1 || text.length > 6)) {
				requestAnimationFrame(function () {
					addBookmarkItem(result);
				});
				resultsShown++;
			}

		});
		limitHistoryResults(5 - resultsShown); //if we have lots of bookmarks, don't show as many regular history items

	});
}, 133);

var showAllBookmarks = function () {
	bookmarks.searchBookmarks("", function (results) {

		results.sort(function (a, b) {
			//http://stackoverflow.com/questions/6712034/sort-array-by-firstname-alphabetically-in-javascript
			if (a.url < b.url) return -1;
			if (a.url > b.url) return 1;
			return 0;
		});
		results.forEach(addBookmarkItem);
	});
}
