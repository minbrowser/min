var DDGSearchUrlRegex = /^https:\/\/duckduckgo.com\/\?q=([^&]*).*/g,
	plusRegex = /\+/g,
	trailingSlashRegex = /\/$/g;

var showHistoryResults = function (text, input, maxItems) {

	if (!text) {
		return;
	}

	var input0 = input[0];

	bookmarks.searchHistory(text, function (results) {
		historyarea.html("");

		limitSearchSuggestions(results.length);

		results.forEach(function (result, index) {

			//if we've started typing the result and didn't press the delete key (which should make the highlight go away), autocomplete in the input

			var text = input.val(); //make sure the input hasn't changed between start and end of query

			var textWithoutProtocol = urlParser.removeProtocol(text),
				UrlWithoutProtocol = urlParser.removeProtocol(result.url);

			if (textWithoutProtocol != text) {
				var hasProtocol = true;
			}
			var hasWWW = text.indexOf("www.") != -1

			if (textWithoutProtocol.indexOf("/") == -1) {
				var hasPath = false;
			} else {
				var hasPath = true;
			}
			if (shouldContinueAC && cachedACItem.indexOf(text) == 0) {
				input.blur();
				input0.value = cachedACItem;
				input0.setSelectionRange(text.length, cachedACItem.length);
				input.focus();
				awesomebarCachedText = input.val();
				shouldContinueAC = false;
			}
			if (autocompleteEnabled && shouldContinueAC && textWithoutProtocol && UrlWithoutProtocol.indexOf(textWithoutProtocol) == 0) { //the user has started to type the url
				var withWWWset = ((hasWWW) ? result.url : result.url.replace("www.", ""))
				var ac = ((hasProtocol) ? withWWWset : UrlWithoutProtocol);
				if (!hasPath && !urlParser.isSystemURL(withWWWset)) {
					//if there isn't a / character typed yet, we only want to autocomplete to the domain
					var a = document.createElement("a");
					a.href = withWWWset;
					ac = ((hasProtocol) ? a.protocol + "//" : "") + a.hostname;
				}
				if (!ac) { //make sure we have something to autocomplete - this could not exist if we are using domain autocomplete and the ac string didn't have a hostname when processed
					return;
				}
				input.blur();
				input0.value = ac;
				input0.setSelectionRange(text.length, ac.length);
				input.focus(); //update cache
				awesomebarCachedText = input0.value,
					shouldContinueAC = false,
					cachedACItem = ac;
			}

			if (index < maxItems) { //only show up to n history items

				var title = result.title;
				var icon = $("<i class='fa fa-globe'>");

				DDGSearchUrlRegex.lastIndex = 0;

				if (DDGSearchUrlRegex.test(result.url)) {
					//the history item is a search, display it like a search suggestion
					title = decodeURIComponent(result.url.replace(DDGSearchUrlRegex, "$1").replace(plusRegex, " "));
					console.log(result.url);
					icon = $("<i class='fa fa-search'>");
				}

				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(title)).on("click", function (e) {
					//if the command key was pressed, open in background while still showing awesomebar

					if (e.metaKey) {
						openURLInBackground(result.url);

					} else {
						navigate(tabs.getSelected(), result.url);
					}
				});

				icon.prependTo(item);

				$("<span class='secondary-text'>").text(urlParser.removeProtocol(result.url).replace(trailingSlashRegex, "")).appendTo(item);

				item.appendTo(historyarea);
			}

		});
	});
}
