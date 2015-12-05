/* defines keybindings that aren't in the menu (so they aren't defined by menu.js). For items in the menu, also handles ipc messages */

ipc.on("zoomIn", function () {
	getWebview(tabs.getSelected())[0].send("zoomIn");
});

ipc.on("zoomOut", function () {
	getWebview(tabs.getSelected())[0].send("zoomOut");
});

ipc.on("zoomReset", function () {
	getWebview(tabs.getSelected())[0].send("zoomReset");
});

ipc.on("print", function () {
	getWebview(tabs.getSelected())[0].print();
})

ipc.on("inspectPage", function () {
	getWebview(tabs.getSelected())[0].openDevTools();
});

ipc.on("addTab", function (e) {
	addTab();
});

ipc.on("addPrivateTab", function (e) {
	var privateTab = tabs.add({
		url: "about:blank",
		private: true,
	})
	addTab(privateTab);
});

var Mousetrap = require("mousetrap");

Mousetrap.bind("shift+command+p", function (e) {
	var privateTab = tabs.add({
		url: "about:blank",
		private: true,
	})
	addTab(privateTab);
});

Mousetrap.bind(["command+l", "command+k"], function (e) {
	enterEditMode(tabs.getSelected());
	return false;
})

Mousetrap.bind("command+w", function (e) {
	e.preventDefault();
	e.stopImmediatePropagation();
	e.stopPropagation();
	destroyTab(tabs.getSelected(), {
		switchToTab: true
	});
	return false;
});

Mousetrap.bind("command+d", function (e) {
	//TODO need an actual api for this that updates the star and bookmarks

	getTabElement(tabs.getSelected()).find(".bookmarks-button").click();
})

Mousetrap.bind("command+f", function (e) {
	findinpage.toggle();
});

// cmd+x should switch to tab x. Cmd+9 should switch to the last tab

for (var i = 0; i < 9; i++) {
	(function (i) {
		Mousetrap.bind("command+" + i, function (e) {
			var newTab = tabs.getAtIndex(i - 1);
			if (!newTab) { //we're trying to switch to a tab that doesn't exist
				return;
			}
			switchToTab(newTab.id);
		})
	})(i);
}

Mousetrap.bind("command+9", function (e) {
	switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
})

Mousetrap.bind("esc", function (e) {
	leaveTabEditMode();
	getWebview(tabs.getSelected()).focus();
});

Mousetrap.bind("shift+command+r", function () {
	getTabElement(tabs.getSelected()).find(".reader-button").trigger("click");
});

//TODO add help docs for this

Mousetrap.bind("command+left", function (d) {
	getWebview(tabs.getSelected())[0].goBack();
});

Mousetrap.bind("command+right", function (d) {
	getWebview(tabs.getSelected())[0].goForward();
});

Mousetrap.bind(["option+command+left", "shift+ctrl+tab"], function (d) {
	var currentIndex = tabs.getIndex(tabs.getSelected());
	var previousTab = tabs.getAtIndex(currentIndex - 1);

	if (previousTab) {
		switchToTab(previousTab.id);
	} else {
		switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
	}
});

Mousetrap.bind(["option+command+right", "ctrl+tab"], function (d) {
	var currentIndex = tabs.getIndex(tabs.getSelected());
	var nextTab = tabs.getAtIndex(currentIndex + 1);

	if (nextTab) {
		switchToTab(nextTab.id);
	} else {
		switchToTab(tabs.getAtIndex(0).id);
	}
});
