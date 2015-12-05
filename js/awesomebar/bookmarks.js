var showBookmarkResults = throttle(function (text) {
	if (text.length < 3) {
		limitHistoryResults(5);
		bookmarkarea.html("");
		return;
	}

	bookmarks.search(text, function (results) {
		bookmarkarea.html("");
		var resultsShown = 1;
		results.splice(0, 2).forEach(function (result) {
			//as more results are added, the threshold for adding another one gets higher
			if (result.score > Math.max(0.0005, 0.00095 - (0.00005 * text.length) * resultsShown)) {

				resultsShown++;

				//create the basic item
				//getRealTitle is defined in awesomebar.js
				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(getRealTitle(result.title))).on("click", function (e) {
					if (e.metaKey) {
						openURLInBackground(result.url);
					} else {
						navigate(tabs.getSelected(), result.url);
					}
				});

				$("<i class='fa fa-star'>").prependTo(item);

				var span = $("<span class='secondary-text'>").text(urlParser.getDomainName(result.url));


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

				item.appendTo(bookmarkarea);

				item.attr("data-url", result.url);
			}

		});
		limitHistoryResults(5 - resultsShown); //if we have lots of bookmarks, don't show as many regular history items

	});
}, 400);
