var sessionRestore = {
	save: function () {
		console.log("saving");
		var data = {
			version: 1,
			tabs: [],
			selected: tabs._state.selected,
		}

		//save all tabs that aren't private

		tabs.get().forEach(function (tab) {
			if (!tab.private) {
				data.tabs.push(tab);
			}
		});

		localStorage.setItem("sessionrestoredata", JSON.stringify(data));
	},
	restore: function () {
		//get the data
		var data = JSON.parse(localStorage.getItem("sessionrestoredata") || "{}");

		localStorage.setItem("sessionrestoredata", "{}");

		if (data.version && data.version != 1) {
			addTab({
				leaveEditMode: false //we know we aren't in edit mode yet, so we don't have to leave it
			});
			return;
		}

		console.info("restoring tabs", data.tabs);

		if (!data || !data.tabs || !data.tabs.length || (data.tabs.length == 1 && data.tabs[0].url == "about:blank")) { //If there are no tabs, or bif we only have one tab, and its about:blank, don't restore
			addTab(tabs.add(), {
				leaveEditMode: false
			});
			return;
		}

		data.tabs.forEach(function (tab, index) {
			if (!tab.private) { //don't restore private tabs
				var newTab = tabs.add(tab);
				addTab(newTab, {
					openInBackground: true,
					leaveEditMode: false,
				});
			}

		});

		//set the selected tab

		switchToTab(data.selected);

		//we delete the data, restore the session, and then re-save it. This means that if for whatever reason the session data is making the browser hang, you can restart it and get a new session.

		sessionRestore.save();


	}
}

//TODO make this a preference

sessionRestore.restore();

setInterval(sessionRestore.save, 15000);
