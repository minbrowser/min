var DDGSearchURLRegex = /^https:\/\/duckduckgo.com\/\?q=([^&]*).*/g,
	trailingSlashRegex = /\/$/g,
	plusRegex = /\+/g;

var currentACItem = null;
var deleteKeyPressed = false;

var maxHistoryResults = 4;

function searchbarAutocomplete(text, input, historyResults) {
	if (!text) {
		currentACItem = null;
		return;
	}

	if (text == searchbarCachedText && input[0].selectionStart != input[0].selectionEnd) { //if nothing has actually changed, don't try to autocomplete
		return;
	}
	//if we moved the selection, we don't want to autocomplete again
	if (didFireKeydownSelChange) {
		return;
	}

	var didAutocomplete = false;

	for (var i = 0; !didAutocomplete && i < historyResults.length; i++) { //we only want to autocomplete the first item that matches
		didAutocomplete = autocompleteResultIfNeeded(input, historyResults[i]); //this returns true or false depending on whether the item was autocompleted or not
	}
}

function autocompleteResultIfNeeded(input, result) {

	//figure out if we should autocomplete based on the title

	DDGSearchURLRegex.lastIndex = 0;
	shouldAutocompleteTitle = DDGSearchURLRegex.test(result.url);

	if (shouldAutocompleteTitle) {
		result.title = decodeURIComponent(result.url.replace(DDGSearchURLRegex, "$1").replace(plusRegex, " "));
	}

	var text = getValue(input); //make sure the input hasn't changed between start and end of query
	var hostname = new URL(result.url).hostname;

	var possibleAutocompletions = [ //the different variations of the URL we can autocomplete
		hostname, //we start with the domain
		(hostname + "/").replace(urlParser.startingWWWRegex, "$1").replace("/", ""), //if that doesn't match, try the hostname without the www instead. The regex requires a slash at the end, so we add one, run the regex, and then remove it
		urlParser.prettyURL(result.url), //then try the whole url
		urlParser.removeProtocol(result.url), //then try the url with querystring
		result.url, //then just try the url with protocol
	]

	if (shouldAutocompleteTitle) {
		possibleAutocompletions.push(result.title);
	}


	for (var i = 0; i < possibleAutocompletions.length; i++) {
		if (!deleteKeyPressed && possibleAutocompletions[i].toLowerCase().indexOf(text.toLowerCase()) == 0) { //we can autocomplete the item

			input.val(possibleAutocompletions[i]);
			input.get(0).setSelectionRange(text.length, possibleAutocompletions[i].length);

			if (i < 2) { //if we autocompleted a domain, the cached item should be the domain, not the full url
				var url = new URL(result.url);
				currentACItem = url.protocol + "//" + url.hostname + "/";
			} else {
				currentACItem = result.url;
			}
			return true;
		}
	}

	//nothing was autocompleted

	currentACItem = null;
	return false;
}

var showHistoryResults = throttle(function (text, input, maxItems) {

	if (!text && input[0].value) { //if the entire input is highlighted (such as when we first focus the input), don't show anything
		return;
	}

	if (text) {
		text = text.trim();
	}

	bookmarks.searchHistory(text, function (results) {

		var showedTopAnswer = false;

		maxItems = maxItems || maxHistoryResults;

		//if there is no text, only history results will be shown, so we can assume that 4 results should be shown.
		if (!text) {
			maxItems = 4;
		}

		historyarea.empty();

		if (topAnswerarea.get(0).getElementsByClassName("history-item").length > 0) {
			topAnswerarea.empty();
		}

		searchbarAutocomplete(text, input, results);

		if (results.length < 10) { //if we don't have a lot of history results, show search suggestions
			limitSearchSuggestions(results.length);
			maxItems = 3;
			showSearchSuggestions(text, input);
		} else if (text.indexOf("!") == -1) { //if we have a !bang, always show results
			serarea.empty();
		}

		var resultsShown = 0;

		//we will never have more than 5 results, so we don't need to create more DOM elements than that

		results = results.splice(0, 5);

		results.forEach(function (result) {

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

			//if we're doing a bang search, but the item isn't a web search, it probably isn't useful, so we shouldn't show it
			if (!shouldAutocompleteTitle && text.indexOf("!") == 0) {
				return;
			}


			var item = $("<div class='result-item history-item' tabindex='-1'>").append($("<span class='title'>").text(getRealTitle(title))).on("click", function (e) {
				openURLFromsearchbar(e, result.url);
			});

			item.attr("data-url", result.url);

			icon.prependTo(item);

			if (!shouldAutocompleteTitle && result.title != result.url) { //if we're autocompleting titles, this is a search, and we don't want to show the URL. If the item title and URL are the same (meaning the item has no title), there is no point in showing a URL since we are showing it in the title field.

				$("<span class='secondary-text'>").text(urlParser.prettyURL(result.url)).appendTo(item);
			}

			if (resultsShown >= maxItems) { //only show up to n history items
				item.prop("hidden", true).addClass("unfocusable");
			}

			if (urlParser.areEqual(currentACItem, result.url) && resultsShown < maxItems && !showedTopAnswer) { //the item is being autocompleted, highlight it
				item.addClass("fakefocus");
				requestAnimationFrame(function () {
					item.appendTo(topAnswerarea);
				});
				showedTopAnswer = true;
			} else {
				requestAnimationFrame(function () {
					item.appendTo(historyarea);
				});
			}


			resultsShown++;

		});

		//show a top answer item if we did domain autocompletion

		if (currentACItem && !showedTopAnswer) {
			var item = $("<div class='result-item history-item fakefocus' tabindex='-1'>").append($("<span class='title'>").text(urlParser.prettyURL(currentACItem))).on("click", function (e) {
				openURLFromsearchbar(e, currentACItem);
			});

			$("<i class='fa fa-globe'>").prependTo(item);

			requestAnimationFrame(function () {
				item.appendTo(topAnswerarea);
			});
		}
	});
}, 50);

function limitHistoryResults(maxItems) {
	maxHistoryResults = Math.min(4, Math.max(maxItems, 2));

	historyarea.find(".result-item:nth-child(n+{items})".replace("{items}", maxHistoryResults + 1)).prop("hidden", true).addClass("unfocusable");
}
