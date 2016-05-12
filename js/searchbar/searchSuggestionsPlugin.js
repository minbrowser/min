var ddgAttribution = "Results from DuckDuckGo";

function showSearchSuggestions(text, input, event, container) {
	if (searchbarResultCount > 3) {
		empty(container);
		return;
	}

	fetch("https://ac.duckduckgo.com/ac/?t=min&q=" + encodeURIComponent(text), {
			cache: "force-cache"
		})
		.then(function (response) {
			return response.json();
		})
		.then(function (results) {

			empty(container);

			if (results && results[0] && results[0].snippet) { //!bang search - ddg api doesn't have a good way to detect this

				//located in bangsPlugin.js
				showBangSearchResults(results.concat(searchCustomBangs(text)), input, event, container);

			} else if (results) {
				results.slice(0, 3).forEach(function (result) {

					var data = {
						title: result.phrase,
					}

					if (bangRegex.test(result.phrase)) {

						data.title = result.phrase.replace(bangRegex, "");

						var bang = result.phrase.match(bangRegex)[0];

						incrementBangCount(bang);
						saveBangUseCounts();

						data.secondaryText = "Search on " + cachedBangSnippets[bang];
					}

					if (urlParser.isURL(result.phrase) || urlParser.isURLMissingProtocol(result.phrase)) { //website suggestions
						data.icon = "fa-globe";
					} else { //regular search results
						data.icon = "fa-search";
					}

					var item = createSearchbarItem(data);

					item.addEventListener("click", function (e) {
						openURLFromsearchbar(e, result.phrase);
					});

					container.appendChild(item);
				});
			}
			searchbarResultCount += results.length;
		});
}

registerSearchbarPlugin('searchSuggestions', {
  index: 3,
  trigger: function (text) {
    return !!text && !tabs.get(tabs.getSelected()).private
  },
  showResults: debounce(showSearchSuggestions, 150)
})
