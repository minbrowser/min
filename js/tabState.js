/* tracks the state of tabs */

var tabs = {
	_state: {
		tabs: [],
		selected: null,
	},
	add: function (tab) {

		//make sure the tab exists before we create it
		if (!tab) {
			throw new TypeError("tab is not defined.")
		}

		tab.url = tab.url || "";

		var tabId = tab.id || Math.round(Math.random() * 100000000000000000); //you can pass an id that will be used, or a random one will be generated.


		tabs._state.tabs.push({
			url: tab.url,
			title: tab.title,
			id: tabId,
			lastActivity: new Date().getTime(),
			secure: false,
			private: tab.private || false,
			readerable: tab.readerable || false,
			backgroundColor: tab.backgroundColor,
			foregroundColor: tab.foregroundColor,
		});

		return tabId;

	},
	update: function (id, data) {
		if (!tabs.get(id)) {
			throw new ReferenceError("Attempted to update a tab that does not exist.");
		}
		var index = -1;
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				index = i;
			}
		}
		for (var key in data) {
			if (data[key] == undefined) {
				throw new ReferenceError("Key " + key + " is undefined.");
			}
			tabs._state.tabs[index][key] = data[key];
		}
	},
	destroy: function (id) {
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				tabs._state.tabs.splice(i, 1);
				return i;
			}
		}
		return false;
	},
	get: function (id) {
		if (!id) { //no id provided, return an array of all tabs
			return tabs._state.tabs.slice(0); //make sure to clone the array. Otherwise, if we loop through the array and make a modification to each tab, weird things will happen, since elements could be removed during the loop.
		}
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				return tabs._state.tabs[i]
			}
		}
		return undefined;
	},
	getIndex: function (id) {
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				return i;
			}
		}
		return -1;
	},
	getSelected: function () {
		return tabs._state.selected;
	},
	getAtIndex: function (index) {
		return tabs._state.tabs[index] || undefined;
	},
	setSelected: function (id) {
		if (!tabs.get(id)) {
			throw new ReferenceError("Attempted to select a tab that does not exist.");
		}
		tabs._state.selected = id;
	},
	count: function () {
		return tabs._state.tabs.length;
	},

}
