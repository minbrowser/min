var sessionRestore = {
	save: function () {
		var data = {
			version: 1,
			tabs: tabs._state.tabs,
			selected: tabs._state.selected,
		}
		localStorage.setItem("sessionrestoredata", JSON.stringify(data));
	},
	restore: function () {
		try {
			//get the data
			var data = JSON.parse(localStorage.getItem("sessionrestoredata") || "{}");

			if (data.version != 1) {
				return;
			}

			console.info("restoring tabs", tabs.get());

			if (!data.tabs || !data.tabs.length || data.tabs.length == 1 && data.tabs[0].url == "about:blank") { //If there are no tabs, or if we only have one tab, and its about:blank, don't restore
				addTab();
				return;
			}

			data.tabs.forEach(function (tab, index) {
				if (!tab.private) { //don't restore private tabs
					var newTab = tabs.add(tab);
					addTab(newTab);
				}

			});

			//set the selected tab

			switchToTab(data.selected);

			setTimeout(function () {
				localStorage.setItem("sessionrestoredata", "{}");
			}, 8000);

		} catch (e) {
			console.warn("failed to restore session, rolling back");

			tabs._state.tabs = [];

			$("webview, .tab-item").remove();

			addTab();

			localStorage.setItem("sessionrestoredata", "{}");

		}
	}
}

//TODO make this a preference

sessionRestore.restore();

setInterval(sessionRestore.save, 15000);
