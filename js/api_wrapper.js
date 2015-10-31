/* common to webview, tabrenderer, etc */

function navigate(tabId, newURL) {
	console.trace();
	console.log("navigated");
	tabs.update(tabId, {
		url: newURL
	});

	updateWebview(tabId, newURL);

	leaveTabEditMode({
		blur: true
	});
}


function destroyTab(id) {
	//focus the next tab, or the previous tab if this was the last tab
	var t = tabs.getIndex(id);
	var nextTab = tabs.getAtIndex(t + 1) || tabs.getAtIndex(t - 1);

	$(".tab-item[data-tab={id}]".replace("{id}", id)).remove(); //remove the actual tab element
	var t = tabs.destroy(id); //remove from state - returns the index of the destroyed tab
	destroyWebview(id); //remove the webview

	console.log(t);
	console.log(nextTab);

	//if there are no other tabs, create a new one
	if (!nextTab) {
		return addTab();
	}
	switchToTab(nextTab.id);

}

/* switches to a tab - update the webview, state, tabstrip, etc. */

function switchToTab(id) {
	leaveTabEditMode();

	tabs.setSelected(id);

	switchToWebview(id);
	setActiveTabElement(id);

	var tabData = tabs.get(id);

	setColor(tabData.backgroundColor, tabData.foregroundColor);

	tabs.update(id, {
		lastActivity: new Date().getTime(),
	});
	tabActivity.refresh();
}
