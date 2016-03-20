function showHistorySuggestions(text, input, event, container) {

	//use the current tab's url for history suggestions, or the previous tab if the current tab is empty
	var url = currentTask.tabs.get(currentTask.tabs.getSelected()).url;

	if (!url || url == "about:blank") {
		var previousTab = currentTask.tabs.getAtIndex(currentTask.tabs.getIndex(currentTask.tabs.getSelected()) - 1);
		if (previousTab) {
			url = previousTab.url;
		}
	}

	bookmarks.getHistorySuggestions(url, function (results) {

		empty(container);

		var tabList = currentTask.tabs.get().map(function (tab) {
			return tab.url;
		});

		results = results.filter(function (item) {
			return tabList.indexOf(item.url) == -1;
		});

		results.slice(0, 4).forEach(function (result) {

			var item = createSearchbarItem({
				title: urlParser.prettyURL(result.url),
				secondaryText: getRealTitle(result.title),
				url: result.url,
				delete: function () {
					bookmarks.deleteHistory(result.url);
				},
			});

			container.appendChild(item);

		})
	});

}

registerSearchbarPlugin("historySuggestions", {
	index: 1,
	trigger: function (text) {
		return !text;
	},
	showResults: showHistorySuggestions,
})
