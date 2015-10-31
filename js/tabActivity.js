/* fades out tabs that are inactive */

var tabActivity = {
	minAge: 500000,
	refresh: function () {
		var tabSet = tabs.get(),
			selected = tabs.getSelected(),
			time = new Date().getTime();


		tabSet.forEach(function (tab) {
			if (time - tab.lastActivity > tabActivity.minAge && selected != tab.id) { //the tab has been inactive for greater than minActivity, and it is not currently selected
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
