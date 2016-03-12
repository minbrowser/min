function showSearchbarHistoryResults(text, input, event, container) {

	bookmarks.searchHistory(text, function (results) {

		//remove a previous top answer

		var historyTopAnswer = getTopAnswer("history");

		if (historyTopAnswer && !hasAutocompleted) {
			historyTopAnswer.remove();
		}

		//clear previous results
		empty(container);

		results.slice(0, 4).forEach(function (result) {

			//only autocomplete an item if the delete key wasn't pressed, and nothing has been autocompleted already
			if (event.keyCode != 8 && !hasAutocompleted) {
				var autocompletionType = autocompleteURL(result, input);

				if (autocompletionType != -1) {
					hasAutocompleted = true;
				}

				if (autocompletionType == 0) { //the domain was autocompleted, show a domain result item
					var domain = new URL(result.url).hostname;

					setTopAnswer("history", createSearchbarItem({
						title: domain,
						url: domain,
						classList: ["fakefocus"],
					}));
				}
			}

			var data = {
				title: urlParser.prettyURL(result.url),
				secondaryText: getRealTitle(result.title),
				url: result.url,
				delete: function () {
					bookmarks.deleteHistory(result.url);
				},
			}

			var item = createSearchbarItem(data);

			if (autocompletionType == 1) { //if this exact URL was autocompleted, show the item as the top answer
				item.classList.add("fakefocus");
				setTopAnswer("history", item);
			} else {
				container.appendChild(item);
			}

		});

		searchbarResultCount += Math.min(results.length, 4); //add the number of results that were displayed

	});

};

registerSearchbarPlugin("history", {
	index: 1,
	trigger: function (text) {
		return !!text && text.indexOf("!") != 0;
	},
	showResults: throttle(showSearchbarHistoryResults, 50),
});
