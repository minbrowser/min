var showBookmarkResults = throttle(function (text) {
	if (!text) {
		return;
	}

	bookmarks.search(text, function (results) {
		bookmarkarea.html("");
		results.splice(0, 2).forEach(function (result) {
			if (result.score > 0.0004) {

				//create the basic item
				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(result.title)).on("click", function (e) {
					if (e.metaKey) {
						openURLInBackground(result.url);
					} else {
						navigate(tabs.getSelected(), result.url);
					}
				});

				$("<i class='fa fa-star'>").prependTo(item);

				var span = $("<span class='secondary-text'>").text(urlParser.removeProtocol(result.url).replace(trailingSlashRegex, ""));


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
			}

		});
	});
}, 400);
