var showBookmarkResults = throttle(function (text) {
	if (text.length < 5 || text.indexOf("!") == 0) { //if there is not enough text, or we're doing a bang search, don't show results
		limitHistoryResults(5);
		bookmarkarea.empty();
		return;
	}

	bookmarks.searchBookmarks(text, function (results) {
		bookmarkarea.empty();
		var resultsShown = 1;
		results.splice(0, 2).forEach(function (result) {
			//as more results are added, the threshold for adding another one gets higher
			if (result.score > Math.max(0.0004, 0.0016 - (0.00012 * Math.pow(1.25, text.length))) && (resultsShown == 1 || text.length > 6)) {

				resultsShown++;

				//create the basic item
				//getRealTitle is defined in searchbar.js
				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(getRealTitle(result.title))).on("click", function (e) {
					openURLFromsearchbar(e, result.url);
				});

				$("<i class='fa fa-star'>").prependTo(item);

				var span = $("<span class='secondary-text'>").text(urlParser.prettyURL(result.url));


				if (result.extraData && result.extraData.metadata) {
					var captionSpans = [];

					if (result.extraData.metadata.rating) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.rating));
					}
					if (result.extraData.metadata.price) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.price));
					}
					if (result.extraData.metadata.location) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.location));
					}


					captionSpans.reverse().forEach(function (s) {
						span.prepend(s);
					})
				}


				span.appendTo(item);

				requestAnimationFrame(function () {
					item.appendTo(bookmarkarea);
				});

				item.attr("data-url", result.url);
			}

		});
		limitHistoryResults(5 - resultsShown); //if we have lots of bookmarks, don't show as many regular history items

	});
}, 400);
