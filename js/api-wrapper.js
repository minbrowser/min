/* common to webview, tabrenderer, etc */

function navigate(tabId, newURL) {
	newURL = urlParser.parse(newURL);

	tabs.update(tabId, {
		url: newURL
	});

	updateWebview(tabId, newURL);

	leaveTabEditMode({
		blur: true
	});
}

function switchToNextTab(oldIndex) {
	var nextTab = tabs.getAtIndex(oldIndex + 1) || tabs.getAtIndex(oldIndex - 1);
	if (nextTab) {
		switchToTab(nextTab.id);
	}
}

function destroyTab(id) {

	$(".tab-item[data-tab={id}]".replace("{id}", id)).remove(); //remove the actual tab element
	var t = tabs.destroy(id); //remove from state - returns the index of the destroyed tab
	destroyWebview(id); //remove the webview

}

/* switches to a tab - update the webview, state, tabstrip, etc. */

function switchToTab(id) {

	leaveTabEditMode();

	setActiveTabElement(id);
	switchToWebview(id, {
		focus: !isExpandedMode //trying to focus a webview while in expanded mode breaks the page
	});

	tabs.setSelected(id);

	var tabData = tabs.get(id);
	setColor(tabData.backgroundColor, tabData.foregroundColor);

	//we only want to mark the tab as active if someone actually interacts with it. If it is clicked on and then quickly clicked away from, it should still be marked as inactive

	setTimeout(function () {
		if (tabs.get(id) && tabs.getSelected() == id) {
			tabs.update(id, {
				lastActivity: Date.now(),
			});
			tabActivity.refresh();
		}
	}, 2500);

}
