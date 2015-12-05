/* fades out tabs that are inactive */

var tabActivity = {
	minFadeAge: 450000,
	refresh: function () {
		var tabSet = tabs.get(),
			selected = tabs.getSelected(),
			time = new Date().getTime();


		tabSet.forEach(function (tab) {
			if (selected == tab.id) { //never fade the current tab
				getTabElement(tab.id).removeClass("fade");
				return;
			}
			if (time - tab.lastActivity > tabActivity.minFadeAge) { //the tab has been inactive for greater than minActivity, and it is not currently selected
				getTabElement(tab.id).addClass("fade");
			} else {
				getTabElement(tab.id).removeClass("fade");
			}
		})
	},
	init: function () {
		setInterval(tabActivity.refresh, 7500);
	}
}
tabActivity.init();
