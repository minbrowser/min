/* provides simple utilities for entering/exiting expanded tab mode */

tabContainer.on("mousewheel", function (e) {
	if (e.originalEvent.deltaY < -30 && e.originalEvent.deltaX < 10) { //swipe down to expand tabs
		enterExpandedMode();
		e.stopImmediatePropagation();
	} else if (e.originalEvent.deltaY > 70 && e.originalEvent.deltaX < 10) {
		leaveExpandedMode();
	}
});

var isExpandedMode = false;

function enterExpandedMode() {
	leaveTabEditMode();

	//get the subtitles

	tabs.get().forEach(function (tab) {
		try {
			var prettyURL = urlParser.prettyURL(tab.url);
		} catch (e) {
			var prettyURL = "";
		}

		getTabElement(tab.id).find(".secondary-text").text(prettyURL);
	});

	tabContainer.addClass("expanded");
	getWebview(tabs.getSelected()).blur();
	tabContainer.get(0).focus();

	isExpandedMode = true;
}

function leaveExpandedMode() {
	tabContainer.removeClass("expanded");

	isExpandedMode = false;
}

//when a tab is clicked, we want to minimize the tabstrip

tabContainer.on("click", ".tab-item", function () {
	if (isExpandedMode) {
		leaveExpandedMode();
		getWebview(tabs.getSelected())[0].focus();
	}
});
