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
		return localStorage.getItem("sessionrestoredata") != "{}";
	},
	restore: function () {
		//get the data
		var data = JSON.parse(localStorage.getItem("sessionrestoredata"));

		//TODO there should be api's to reset the state like this
		tabs._state.tabs = [];
		$(".tab-item, webview").remove(); //this needs to be better, and will break easily

		if (data.tabs.length == 1 && data.tabs[0].url == "about:blank") { //if we only have one tab, and its about:blank, don't restore
			addTab();
			return;
		}

		data.tabs.forEach(function (tab, index) {
			var newTab = tabs.add(tab);
			addTab(newTab);
		});

		//set the selected tab

		switchToTab(data.selected);

		setTimeout(function () {
			localStorage.setItem("sessionrestoredata", "{}");
		}, 8000);
	}
}

//TODO make this a preference

if (sessionRestore.isRestorable()) {
	sessionRestore.restore();
}

setInterval(sessionRestore.save, 20000);
