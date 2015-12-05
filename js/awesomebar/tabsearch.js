var spacesRegex = /[\s._/-]/g; //copied from historyworker.js

var stringScore = require("string_score");

var searchOpenTabs = function (searchText) {

	opentabarea.html("");

	if (searchText.length < 2) {
		return;
	}

	var matches = [],
		selTab = tabs.getSelected();

	tabs.get().forEach(function (item) {
		if (item.id == selTab || !item.title || item.url == "about:blank") {
			return;
		}

		item.url = urlParser.removeProtocol(item.url); //don't search protocols

		var exactMatch = item.title.indexOf(searchText) != -1 || item.url.indexOf(searchText) != -1
		var fuzzyMatch = item.title.substring(0, 50).score(searchText, 0.5) > 0.45 || item.url.score(searchText, 0.5) > 0.4;

		if (exactMatch || fuzzyMatch) {
			matches.push(item);
		}
	});

	matches.splice(0, 2).sort(function (a, b) {
		return b.title.score(searchText, 0.5) - a.title.score(searchText, 0.5);
	}).forEach(function (tab) {
		var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(tab.title))
		$("<span class='secondary-text'>").text(urlParser.removeProtocol(tab.url).replace(trailingSlashRegex, "")).appendTo(item);

		$("<i class='fa fa-external-link'>").attr("title", "Switch to Tab").prependTo(item); //TODO better icon

		item.on("click", function () {
			//if we created a new tab but are switching away from it, destroy the current (empty) tab
			if (tabs.get(tabs.getSelected()).url == "about:blank") {
				destroyTab(tabs.getSelected(), {
					switchToTab: false
				});
			}
			switchToTab(tab.id);
		});

		item.appendTo(opentabarea);
	});
}
