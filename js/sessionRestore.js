var sessionRestore = {
	save: function () {
		var data = {
			version: 1,
			tabs: tabs._state.tabs,
			selected: tabs._state.selected,
		}
		localStorage.setItem("sessionrestoredata", JSON.stringify(data));
	},
	isRestorable: function () {
		return localStorage.getItem("sessionrestoredata") && localStorage.getItem("sessionrestoredata") != "{}";
	},
	restore: function () {
		try {
			//get the data
			var data = JSON.parse(localStorage.getItem("sessionrestoredata") || "{}");

			if (!data || data.version != 1) {
				return;
			}

			console.info("restoring tabs", tabs.get());

			tabs.get().forEach(function (tab) {
				destroyTab(tab.id, {
					switchToTab: false
				});
			});

			if (!data.tabs || !data.tabs.length || data.tabs.length == 1 && data.tabs[0].url == "about:blank") { //if we only have one tab, and its about:blank, don't restore
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

			tabs.get().forEach(function (tab) {
				destroyTab(tab.id, {
					switchToTab: true
				});
			});

		}
	}
}

//TODO make this a preference

if (sessionRestore.isRestorable()) {
	sessionRestore.restore();
}

setInterval(sessionRestore.save, 15000);
