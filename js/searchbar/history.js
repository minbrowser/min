var DDGSearchURLRegex = /^https:\/\/duckduckgo.com\/\?q=([^&]*).*/g,
	trailingSlashRegex = /\/$/g,
	plusRegex = /\+/g;

var currentACItem = null;
var deleteKeyPressed = false;

var historyarea = searchbar.querySelector(".history-results");
var $historyarea = $(historyarea);

var maxHistoryResults = 4;

function searchbarAutocomplete(text, input, historyResults) {
	currentACItem = null;

	if (!text) {
		return;
	}

	if (text == searchbarCachedText && input.selectionStart != input.selectionEnd) { //if nothing has actually changed, don't try to autocomplete
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
	try {
		var hostname = new URL(result.url).hostname;
	} catch (e) {
		console.warn(result.url);
	}

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

			input.value = possibleAutocompletions[i];
			input.setSelectionRange(text.length, possibleAutocompletions[i].length);

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

	return false;
}

var showHistoryResults = throttle(function (text, input, maxItems) {

	if (!text && input.value) { //if the entire input is highlighted (such as when we first focus the input), don't show anything
		return;
	}

	var textToSearch = text;

	if (text) {
		textToSearch = text.trim();
	}

	//if we're offline, the only sites that will work are reader articles, so we should show those as top sites

	if (!textToSearch && !navigator.onLine) {
		var showingReaderArticles = true;
		textToSearch = readerView.readerURL;
	}

	bookmarks.searchHistory(textToSearch, function (results) {

		//show the most recent articles

		if (showingReaderArticles) {
			results.sort(function (a, b) {
				return b.lastVisit - a.lastVisit;
			});
		}

		var showedTopAnswer = false;

		maxItems = maxItems || maxHistoryResults;

		//if there is no text, only history results will be shown, so we can assume that 4 results should be shown.
		if (!text) {
			maxItems = 4;
		}

		empty(historyarea);

		if (topAnswerarea.getElementsByClassName("history-item").length > 0) {
			empty(topAnswerarea);
		}

		searchbarAutocomplete(text, input, results);

		if (results.length < 10) { //if we don't have a lot of history results, show search suggestions
			limitSearchSuggestions(results.length);
			maxItems = 3;
			showSearchSuggestions(text, input);
		} else if (text.indexOf("!") == -1) { //if we have a !bang, always show results
			empty(serarea);
		}

		var resultsShown = 0;

		//we will never have more than 5 results, so we don't need to create more DOM elements than that

		requestAnimationFrame(function () {

			var isBangSearch = text.indexOf("!") == 0;

			results.slice(0, 5).forEach(function (result) {

				DDGSearchURLRegex.lastIndex = 0;
				var isDDGSearch = DDGSearchURLRegex.test(result.url);

				//if we're doing a bang search, but the item isn't a web search, it probably isn't useful, so we shouldn't show it
				if (!isDDGSearch && isBangSearch) {
					return;
				}


				if (isDDGSearch) { //show the result like a search suggestion

					var processedTitle = decodeURIComponent(result.url.replace(DDGSearchURLRegex, "$1").replace(plusRegex, " "));

					var data = {
						icon: "fa-search",
						title: processedTitle,
						url: result.url,
						classList: ["history-item"],
					}
				} else {
					var data = {
						icon: "fa-globe",
						title: getRealTitle(result.title) || result.url,
						url: result.url,
						classList: ["history-item"],
					}

					if (result.title !== result.url) {
						data.secondaryText = urlParser.prettyURL(result.url);
					}
				}


				var item = createSearchbarItem(data);

				item.addEventListener("click", function (e) {
					openURLFromsearchbar(e, result.url);
				});

				if (resultsShown >= maxItems) { //only show up to n history items
					item.hidden = true;
					item.classList.add("unfocusable");
				}

				if (urlParser.areEqual(currentACItem, result.url) && resultsShown < maxItems && !showedTopAnswer) { //the item is being autocompleted, highlight it
					item.classList.add("fakefocus");
					topAnswerarea.appendChild(item);
					showedTopAnswer = true;
				} else {
					historyarea.appendChild(item)
				}


				resultsShown++;

			});

			//show a top answer item if we did domain autocompletion

			if (currentACItem && !showedTopAnswer && !DDGSearchURLRegex.test(currentACItem)) {
				var item = createSearchbarItem({
					classList: ["history-item", "fakefocus"],
					icon: "fa-globe",
					title: urlParser.prettyURL(currentACItem),
				});

				item.addEventListener("click", function (e) {
					openURLFromsearchbar(e, currentACItem);
				});

				topAnswerarea.appendChild(item);
			}
		});

	});
}, 50);

function limitHistoryResults(maxItems) {
	maxHistoryResults = Math.min(4, Math.max(maxItems, 2));

	$historyarea.find(".result-item:nth-child(n+{items})".replace("{items}", maxHistoryResults + 1)).prop("hidden", true).addClass("unfocusable");
}
