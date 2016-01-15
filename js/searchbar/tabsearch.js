var spacesRegex = /[\s._/-]/g; //copied from historyworker.js
var opentabarea = searchbar.querySelector(".opentab-results");

var stringScore = require("string_score");

var searchOpenTabs = function (searchText) {

	requestAnimationFrame(function () {

		empty(opentabarea);

		if (searchText.length < 3) {
			return;
		}

		var matches = [],
			selTab = tabs.getSelected();

		tabs.get().forEach(function (item) {
			if (item.id == selTab || !item.title || item.url == "about:blank") {
				return;
			}

			var itemUrl = urlParser.removeProtocol(item.url); //don't search protocols

			var exactMatch = item.title.indexOf(searchText) != -1 || itemUrl.indexOf(searchText) != -1
			var fuzzyMatch = item.title.substring(0, 50).score(searchText, 0.5) > 0.4 || itemUrl.score(searchText, 0.5) > 0.4;

			if (exactMatch || fuzzyMatch) {
				matches.push(item);
			}
		});

		matches.splice(0, 2).sort(function (a, b) {
			return b.title.score(searchText, 0.5) - a.title.score(searchText, 0.5);
		}).forEach(function (tab) {
			var data = {
				icon: "fa-external-link-square",
				title: tab.title,
				secondaryText: urlParser.removeProtocol(tab.url).replace(trailingSlashRegex, "")
			}

			var item = createSearchbarItem(data);

			item.addEventListener("click", function () {
				//if we created a new tab but are switching away from it, destroy the current (empty) tab
				if (tabs.get(tabs.getSelected()).url == "about:blank") {
					destroyTab(tabs.getSelected(), {
						switchToTab: false
					});
				}
				switchToTab(tab.id);
			});

			opentabarea.appendChild(item);
		});
	});
}
