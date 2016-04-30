/* defines keybindings that aren't in the menu (so they aren't defined by menu.js). For items in the menu, also handles ipc messages */

ipc.on("zoomIn", function () {
	getWebview(tabs.getSelected()).send("zoomIn");
});

ipc.on("zoomOut", function () {
	getWebview(tabs.getSelected()).send("zoomOut");
});

ipc.on("zoomReset", function () {
	getWebview(tabs.getSelected()).send("zoomReset");
});

ipc.on("print", function () {
	getWebview(tabs.getSelected()).print();
})

ipc.on("findInPage", function () {
	findinpage.start();
})

ipc.on("inspectPage", function () {
	getWebview(tabs.getSelected()).openDevTools();
});

ipc.on("showReadingList", function () {
	readerView.showReadingList();
})

ipc.on("addTab", function (e, data) {

	/* new tabs can't be created in focus mode */
	if (isFocusMode) {
		showFocusModeError();
		return;
	}

	var newIndex = tabs.getIndex(tabs.getSelected()) + 1;
	var newTab = tabs.add({
		url: data.url || "",
	}, newIndex);

	addTab(newTab, {
		enterEditMode: !data.url, //only enter edit mode if the new tab is about:blank
	});
});

function addPrivateTab() {


	/* new tabs can't be created in focus mode */
	if (isFocusMode) {
		showFocusModeError();
		return;
	}


	if (isEmpty(tabs.get())) {
		destroyTab(tabs.getAtIndex(0).id);
	}

	var newIndex = tabs.getIndex(tabs.getSelected()) + 1;

	var privateTab = tabs.add({
		url: "about:blank",
		private: true,
	}, newIndex)
	addTab(privateTab);
}

ipc.on("addPrivateTab", addPrivateTab);

ipc.on("addTask", function () {
	/* new tasks can't be created in focus mode */
	if (isFocusMode) {
		showFocusModeError();
		return;
	}

	addTaskFromOverlay();
	taskOverlay.show();
	setTimeout(function () {
		taskOverlay.hide();
		enterEditMode(tabs.getSelected());
	}, 600);
});

require.async("mousetrap", function (Mousetrap) {
	window.Mousetrap = Mousetrap;

	Mousetrap.bind("shift+mod+p", addPrivateTab);

	Mousetrap.bind(["mod+l", "mod+k"], function (e) {
		enterEditMode(tabs.getSelected());
		return false;
	})

	Mousetrap.bind("mod+w", function (e) {

		//prevent mod+w from closing the window
		e.preventDefault();
		e.stopImmediatePropagation();

		closeTab(tabs.getSelected());

		return false;
	});

	Mousetrap.bind("mod+d", function (e) {
		bookmarks.handleStarClick(getTabElement(tabs.getSelected()).querySelector(".bookmarks-button"));
		enterEditMode(tabs.getSelected()); //we need to show the bookmarks button, which is only visible in edit mode
	});

	// cmd+x should switch to tab x. Cmd+9 should switch to the last tab

	for (var i = 1; i < 9; i++) {
		(function (i) {
			Mousetrap.bind("mod+" + i, function (e) {
				var currentIndex = tabs.getIndex(tabs.getSelected());
				var newTab = tabs.getAtIndex(currentIndex + i) || tabs.getAtIndex(currentIndex - i);
				if (newTab) {
					switchToTab(newTab.id);
				}
			})

			Mousetrap.bind("shift+mod+" + i, function (e) {
				var currentIndex = tabs.getIndex(tabs.getSelected());
				var newTab = tabs.getAtIndex(currentIndex - i) || tabs.getAtIndex(currentIndex + i);
				if (newTab) {
					switchToTab(newTab.id);
				}
			})

		})(i);
	}

	Mousetrap.bind("mod+9", function (e) {
		switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
	})

	Mousetrap.bind("shift+mod+9", function (e) {
		switchToTab(tabs.getAtIndex(0).id);
	})

	Mousetrap.bind("esc", function (e) {
		taskOverlay.hide();

		leaveTabEditMode();
		if (findinpage.isEnabled) {
			findinpage.end(); //this also focuses the webview
		} else {
			getWebview(tabs.getSelected()).focus();
		}
	});

	Mousetrap.bind("shift+mod+r", function () {
		var tab = tabs.get(tabs.getSelected());

		if (tab.isReaderView) {
			readerView.exit(tab.id);
		} else {
			readerView.enter(tab.id);
		}
	});

	//TODO add help docs for this

	Mousetrap.bind("mod+left", function (d) {
		getWebview(tabs.getSelected()).goBack();
	});

	Mousetrap.bind("mod+right", function (d) {
		getWebview(tabs.getSelected()).goForward();
	});

	Mousetrap.bind(["option+mod+left", "shift+ctrl+tab"], function (d) {

		var currentIndex = tabs.getIndex(tabs.getSelected());
		var previousTab = tabs.getAtIndex(currentIndex - 1);

		if (previousTab) {
			switchToTab(previousTab.id);
		} else {
			switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
		}
	});

	Mousetrap.bind(["option+mod+right", "ctrl+tab"], function (d) {

		var currentIndex = tabs.getIndex(tabs.getSelected());
		var nextTab = tabs.getAtIndex(currentIndex + 1);

		if (nextTab) {
			switchToTab(nextTab.id);
		} else {
			switchToTab(tabs.getAtIndex(0).id);
		}
	});

	Mousetrap.bind("mod+n", function (d) { //destroys all current tabs, and creates a new, empty tab. Kind of like creating a new window, except the old window disappears.

		var tset = tabs.get();
		for (var i = 0; i < tset.length; i++) {
			destroyTab(tset[i].id);
		}

		addTab(); //create a new, blank tab
	});

	Mousetrap.bind("shift+mod+e", function () {
		if (taskOverlay.isShown) {
			taskOverlay.hide();
		} else {
			taskOverlay.show();
		}
	});

	Mousetrap.bind("shift+mod+b", function () {
		clearSearchbar();
		showSearchbar(getTabInput(tabs.getSelected()));
		enterEditMode(tabs.getSelected());
		showAllBookmarks();
	});

	var lastReload = 0;

	Mousetrap.bind("mod+r", function () {
		var time = Date.now();

		//pressing mod+r twice in a row reloads the whole browser
		if (time - lastReload < 500) {
			window.location.reload();
		} else {
			var w = getWebview(tabs.getSelected());

			if (w.src) { //webview methods aren't available if the webview is blank
				w.reloadIgnoringCache();
			}
		}

		lastReload = time;
	});

}); //end require mousetrap

//reload the webview when the F5 key is pressed
document.body.addEventListener("keydown", function (e) {
	if (e.keyCode == 116) {
		try {
			getWebview(tabs.getSelected()).reloadIgnoringCache();
		} catch (e) {}
	}
});
