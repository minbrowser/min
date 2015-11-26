var spacesRegex = /[\s._/-]/g; //copied from historyworker.js

var stringScore = require("string_score");

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
		if (item.title.indexOf(searchText) != -1 || item.title.score(searchText, 0.5) > 0.25 || item.url.indexOf(searchText) != -1 || item.url.score(searchText, 0.5) > 0.25) {
			matches.push(item);
		}
	});

	matches.splice(0, 2).sort(function (a, b) {
		return a.lastActivity - b.lastActivity;
	}).forEach(function (tab) {
		var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(tab.title)).on("click", function () {

			//if we created a new tab but are switching away from it, destroy the current (empty) tab
			if (tabs.get(tabs.getSelected()).url == "about:blank") {
				destroyTab(tabs.getSelected(), {
					switchToTab: false
				});
			}

			switchToTab(tab.id);
		});

		$("<i class='fa fa-external-link'>").attr("title", "Switch to Tab").prependTo(item); //TODO better icon
		item.appendTo(opentabarea);
	})
}
