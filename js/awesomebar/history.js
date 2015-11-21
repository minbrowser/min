var DDGSearchURLRegex = /^https:\/\/duckduckgo.com\/\?q=([^&]*).*/g,
	plusRegex = /\+/g,
	trailingSlashRegex = /\/$/g;

var shouldAutocompleteTitle;
var hasAutocompleted = false;

var cachedHistoryResults = [];
var maxHistoryResults = 3;

function awesomebarAutocomplete(input) {
	if (input.val() == awesomebarCachedText && input[0].selectionStart != input[0].selectionEnd) { //if nothing has actually changed, don't try to autocomplete
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

	var text = input.val(); //make sure the input hasn't changed between start and end of query


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

var showHistoryResults = function (text, input, maxItems) {

	maxItems = maxItems || maxHistoryResults;

	if (!text) {
		return;
	}

	bookmarks.searchHistory(text, function (results) {
		historyarea.html("");


		cachedHistoryResults = results;

		awesomebarAutocomplete(input);

		limitSearchSuggestions(results.length);

		results.forEach(function (result, index) {

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

			if (index < maxItems) { //only show up to n history items

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

function limitHistoryResults(maxItems) {
	maxHistoryResults = Math.min(3, Math.max(maxItems, 2));
	historyarea.find(".result-item:nth-child(n+{items})".replace("{items}", maxHistoryResults + 1)).remove();
}
