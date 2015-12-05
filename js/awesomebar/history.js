var DDGSearchURLRegex = /^https:\/\/duckduckgo.com\/\?q=([^&]*).*/g,
	trailingSlashRegex = /\/$/g,
	plusRegex = /\+/g;

var shouldAutocompleteTitle;
var hasAutocompleted = false;

var cachedHistoryResults = [];
var maxHistoryResults = 4;

function awesomebarAutocomplete(text, input) {
	if (text == awesomebarCachedText && input[0].selectionStart != input[0].selectionEnd) { //if nothing has actually changed, don't try to autocomplete
		return;
	}
	//if we moved the selection, we don't want to autocomplete again
	if (didFireKeydownSelChange) {
		return;
	}
	for (var i = 0; i < cachedHistoryResults.length; i++) {
		if (autocompleteResultIfNeeded(input, cachedHistoryResults[i])) {
			hasAutocompleted = true;
		}
	}
}

function autocompleteResultIfNeeded(input, result) {

	DDGSearchURLRegex.lastIndex = 0;

	shouldAutocompleteTitle = DDGSearchURLRegex.test(result.url);

	if (shouldAutocompleteTitle) {
		result.title = decodeURIComponent(result.url.replace(DDGSearchURLRegex, "$1").replace(plusRegex, " "));
	}

	var text = getValue(input); //make sure the input hasn't changed between start and end of query

	var textWithoutProtocol = urlParser.removeProtocol(text),
		URLWithoutProtocol = urlParser.removeProtocol(result.url);

	if (textWithoutProtocol != text) {
		var hasProtocol = true;
	}
	var hasWWW = text.indexOf("www.") != -1

	if (textWithoutProtocol.indexOf("/") == -1) {
		var hasPath = false;
	} else {
		var hasPath = true;
	}

	var canAutocompleteURL = URLWithoutProtocol.indexOf(textWithoutProtocol) == 0 && !shouldAutocompleteTitle;


	if (autocompleteEnabled && shouldContinueAC && textWithoutProtocol && (canAutocompleteURL || (shouldAutocompleteTitle && result.title.indexOf(textWithoutProtocol) == 0))) { //the user has started to type the url
		if (shouldAutocompleteTitle) {
			var ac = result.title;
		} else {
			//figure out the right address component to autocomplete

			var withWWWset = ((hasWWW) ? result.url : result.url.replace("www.", ""))
			var ac = ((hasProtocol) ? withWWWset : URLWithoutProtocol);
			if (!hasPath && !urlParser.isSystemURL(withWWWset)) {
				//if there isn't a / character typed yet, we only want to autocomplete to the domain
				var a = document.createElement("a");
				a.href = withWWWset;
				ac = ((hasProtocol) ? a.protocol + "//" : "") + a.hostname;
			}
		}

		if (!ac) { //make sure we have something to autocomplete - this could not exist if we are using domain autocomplete and the ac string didn't have a hostname when processed
			return;
		}

		input.blur();
		input[0].value = ac;
		input[0].setSelectionRange(text.length, ac.length);
		input.focus(); //update cache
		awesomebarCachedText = input[0].value,
			shouldContinueAC = false;

		return true;
	}
	return false;
}

var showHistoryResults = throttle(function (text, input, maxItems) {

	if (!text) {
		return;
	}

	bookmarks.searchHistory(text, function (results) {

		maxItems = maxItems || maxHistoryResults;

		historyarea.html("");

		cachedHistoryResults = results;

		awesomebarAutocomplete(text, input);

		if (results.length < 20) { //if we have a lot of history results, don't show search suggestions
			limitSearchSuggestions(results.length);
			showSearchSuggestions(text, input);
		} else if (text.indexOf("!") == -1) { //if we have a !bang, always show results
			serarea.html("");
		}

		var resultsShown = 0;

		results.forEach(function (result) {

			//if there is a bookmark result found, don't show a history item

			if (bookmarkarea.find(".result-item[data-url='{url}']".replace("{url}", result.url.replace(/'/g, "")))[0]) {
				return;
			}

			var shouldAutocompleteTitle = false;

			var title = result.title;
			var icon = $("<i class='fa fa-globe'>");

			//special formatting for ddg search history results

			DDGSearchURLRegex.lastIndex = 0;

			if (DDGSearchURLRegex.test(result.url)) {
				//the history item is a search, display it like a search suggestion
				title = decodeURIComponent(result.url.replace(DDGSearchURLRegex, "$1").replace(plusRegex, " "));
				icon = $("<i class='fa fa-search'>");
				shouldAutocompleteTitle = true; //previous searches can be autocompleted
			}

			//if we've started typing the result and didn't press the delete key (which should make the highlight go away), autocomplete in the input


			var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(getRealTitle(title))).on("click", function (e) {
				//if the command key was pressed, open in background while still showing awesomebar

				if (e.metaKey) {
					openURLInBackground(result.url);

				} else {
					navigate(tabs.getSelected(), result.url);
				}
			});

			icon.prependTo(item);

			if (!shouldAutocompleteTitle && result.title != result.url) { //if we're autocompleting titles, this is a search, and we don't want to show the URL. If the item title and URL are the same (meaning the item has no title), there is no point in showing a URL since we are showing it in the title field.

				$("<span class='secondary-text'>").text(urlParser.prettyURL(result.url)).appendTo(item);
			}

			if (resultsShown >= maxItems) { //only show up to n history items
				item.hide().addClass("unfocusable");
			}

			item.appendTo(historyarea);


			resultsShown++;

		});
	});
}, 100);

function limitHistoryResults(maxItems) {
	maxHistoryResults = Math.min(4, Math.max(maxItems, 2));
	console.log("limiting maxHistoryResults to " + maxHistoryResults);
	historyarea.find(".result-item").show().removeClass("unfocusable");
	historyarea.find(".result-item:nth-child(n+{items})".replace("{items}", maxHistoryResults + 1)).hide().addClass("unfocusable");
}
