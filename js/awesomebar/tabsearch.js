var spacesRegex = /[\s._/-]/g; //copied from historyworker.js


/* most of this is copied from searchHistory in historyworker.js */

var searchOpenTabs = function (searchText) {
	var searchWords = searchText.toLowerCase().split(spacesRegex);
	var matches = [];

	var selTab = tabs.getSelected();

	opentabarea.html("");

	if (!searchText || searchText.length < 2) {
		return;
	}

	var stl = searchText.length;

	tabs.get().forEach(function (item) {
		if (item.id == selTab || !item.title || item.url == "about:blank") {
			return;
		}
		var doesMatch = true;
		var itemWords = urlParser.removeProtocol(item.url);

		if (stl > 3) {
			itemWords += item.title
		}

		itemWords = itemWords.toLowerCase().replace(spacesRegex, "").toString();

		for (var i = 0; i < searchWords.length; i++) {
			if (itemWords.indexOf(searchWords[i]) == -1) {
				doesMatch = false;
				break;
			}
		}
		if (doesMatch) {
			matches.push(item);
		}
	});

	matches.splice(0, 2).sort(function (a, b) {
		return a.lastActivity - b.lastActivity;
	}).forEach(function (tab) {
		var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(tab.title)).on("click", function () {
			switchToTab(tab.id);
		});

		$("<i class='fa fa-external-link'>").attr("title", "Switch to Tab").prependTo(item); //TODO better icon
		item.appendTo(opentabarea);
	})
}
