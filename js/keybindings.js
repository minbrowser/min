/* defines keybindings that aren't in the menu (so they aren't defined by menu.js). For items in the menu, also handles ipc messages */

ipc.on("zoomIn", function () {
	getWebview(currentTask.tabs.getSelected()).send("zoomIn");
});

ipc.on("zoomOut", function () {
	getWebview(currentTask.tabs.getSelected()).send("zoomOut");
});

ipc.on("zoomReset", function () {
	getWebview(currentTask.tabs.getSelected()).send("zoomReset");
});

ipc.on("print", function () {
	getWebview(currentTask.tabs.getSelected()).print();
})

ipc.on("findInPage", function () {
	findinpage.start();
})

ipc.on("inspectPage", function () {
	getWebview(currentTask.tabs.getSelected()).openDevTools();
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

	var newIndex = currentTask.tabs.getIndex(currentTask.tabs.getSelected()) + 1;
	var newTab = currentTask.tabs.add({
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


	if (isEmpty(currentTask.tabs.get())) {
		destroyTab(currentTask.tabs.getAtIndex(0).id);
	}

	var newIndex = currentTask.tabs.getIndex(currentTask.tabs.getSelected()) + 1;

	var privateTab = currentTask.tabs.add({
		url: "about:blank",
		private: true,
	}, newIndex);

	addTab(privateTab);
}

ipc.on("addPrivateTab", addPrivateTab);

require.async("mousetrap", function (Mousetrap) {
	window.Mousetrap = Mousetrap;

	Mousetrap.bind("shift+mod+p", addPrivateTab);

	Mousetrap.bind(["mod+l", "mod+k"], function (e) {
		enterEditMode(currentTask.tabs.getSelected());
		return false;
	})

	Mousetrap.bind("mod+w", function (e) {

		//prevent mod+w from closing the window
		e.preventDefault();
		e.stopImmediatePropagation();


		/* disabled in focus mode */
		if (isFocusMode) {
			showFocusModeError();
			return;
		}

		var currentTab = currentTask.tabs.getSelected();
		var currentIndex = currentTask.tabs.getIndex(currentTab);
		var nextTab = currentTask.tabs.getAtIndex(currentIndex - 1) || currentTask.tabs.getAtIndex(currentIndex + 1);

		destroyTab(currentTab);
		if (nextTab) {
			switchToTab(nextTab.id);
		} else {
			addTab();
		}

		//re-render the overlay to delete the tab element
		if (taskOverlay.isShown) {
			taskOverlay.show();
		}

		return false;
	});

	Mousetrap.bind("mod+d", function (e) {
		bookmarks.handleStarClick(getTabElement(currentTask.tabs.getSelected()).querySelector(".bookmarks-button"));
		enterEditMode(currentTask.tabs.getSelected()); //we need to show the bookmarks button, which is only visible in edit mode
	});

	// cmd+x should switch to tab x. Cmd+9 should switch to the last tab

	for (var i = 1; i < 9; i++) {
		(function (i) {
			Mousetrap.bind("mod+" + i, function (e) {
				var currentIndex = currentTask.tabs.getIndex(currentTask.tabs.getSelected());
				var newTab = currentTask.tabs.getAtIndex(currentIndex + i) || currentTask.tabs.getAtIndex(currentIndex - i);
				if (newTab) {
					switchToTab(newTab.id);
				}
			})

			Mousetrap.bind("shift+mod+" + i, function (e) {
				var currentIndex = currentTask.tabs.getIndex(currentTask.tabs.getSelected());
				var newTab = currentTask.tabs.getAtIndex(currentIndex - i) || currentTask.tabs.getAtIndex(currentIndex + i);
				if (newTab) {
					switchToTab(newTab.id);
				}
			})

		})(i);
	}

	Mousetrap.bind("mod+9", function (e) {
		switchToTab(currentTask.tabs.getAtIndex(currentTask.tabs.count() - 1).id);
	})

	Mousetrap.bind("shift+mod+9", function (e) {
		switchToTab(currentTask.tabs.getAtIndex(0).id);
	})

	Mousetrap.bind("esc", function (e) {
		leaveTabEditMode();
		taskOverlay.hide();
		if (findinpage.isEnabled) {
			findinpage.end(); //this also focuses the webview
		} else {
			getWebview(currentTask.tabs.getSelected()).focus();
		}
	});

	Mousetrap.bind("shift+mod+r", function () {
		var tab = currentTask.tabs.get(currentTask.tabs.getSelected());

		if (tab.isReaderView) {
			readerView.exit(tab.id);
		} else {
			readerView.enter(tab.id);
		}
	});

	//TODO add help docs for this

	Mousetrap.bind("mod+left", function (d) {
		getWebview(currentTask.tabs.getSelected()).goBack();
	});

	Mousetrap.bind("mod+right", function (d) {
		getWebview(currentTask.tabs.getSelected()).goForward();
	});

	Mousetrap.bind(["option+mod+left", "shift+ctrl+tab"], function (d) {

		var currentIndex = currentTask.tabs.getIndex(currentTask.tabs.getSelected());
		var previousTab = currentTask.tabs.getAtIndex(currentIndex - 1);

		if (previousTab) {
			switchToTab(previousTab.id);
		} else {
			switchToTab(currentTask.tabs.getAtIndex(currentTask.tabs.count() - 1).id);
		}
	});

	Mousetrap.bind(["option+mod+right", "ctrl+tab"], function (d) {

		var currentIndex = currentTask.tabs.getIndex(currentTask.tabs.getSelected());
		var nextTab = currentTask.tabs.getAtIndex(currentIndex + 1);

		if (nextTab) {
			switchToTab(nextTab.id);
		} else {
			switchToTab(currentTask.tabs.getAtIndex(0).id);
		}
	});

	Mousetrap.bind("mod+n", function (d) { //destroys all current tabs, and creates a new, empty tab. Kind of like creating a new window, except the old window disappears.

		var tset = currentTask.tabs.get();
		for (var i = 0; i < tset.length; i++) {
			destroyTab(tset[i].id);
		}

		addTab(); //create a new, blank tab
	});

	//return hides task overlay

	Mousetrap.bind("return", function () {
		if (taskOverlay.isShown) {
			taskOverlay.hide();
		}
	});

	Mousetrap.bind("shift+mod+e", function () {
		if (!taskOverlay.isShown) {
			taskOverlay.show();
		} else {
			taskOverlay.hide();
		}
	});

	Mousetrap.bind("shift+mod+b", function () {
		clearSearchbar();
		showSearchbar(getTabInput(currentTask.tabs.getSelected()));
		enterEditMode(currentTask.tabs.getSelected());
		showAllBookmarks();
	});

}); //end require mousetrap
