/* provides simple utilities for entering/exiting expanded tab mode */

require.async("dragula", function (dragula) {

	var dragRegion = dragula([tabGroup[0]]); //tabs can only be dragged in expanded mode, since the window titlebar will capture drag events otherwise

	//reorder the tab state when a tab is dropped
	dragRegion.on("drop", function () {

		var tabOrder = [];

		tabContainer.find(".tab-item").each(function () {
			var tabId = parseInt($(this).attr("data-tab"));
			tabOrder.push(tabId);
		});

		tabs.reorder(tabOrder);
	});

});

tabContainer.on("mousewheel", function (e) {
	if (e.originalEvent.deltaY < -30 && e.originalEvent.deltaX < 10) { //swipe down to expand tabs
		enterExpandedMode();
		e.stopImmediatePropagation();
	} else if (e.originalEvent.deltaY > 70 && e.originalEvent.deltaX < 10) {
		leaveExpandedMode();
	}
});

tabContainer.on("mouseenter", ".tab-item", function (e) {
	if (isExpandedMode) {
		var item = $(this);
		setTimeout(function () {
			if (item.is(":hover")) {
				var tab = tabs.get(item.attr("data-tab"));

				switchToTab(item.attr("data-tab"));
			}
		}, 125);
	}
});

var isExpandedMode = false;

function enterExpandedMode() {
	if (!isExpandedMode) {
		leaveTabEditMode();

		//get the subtitles

		tabs.get().forEach(function (tab) {
			try {
				var prettyURL = urlParser.prettyURL(tab.url);
			} catch (e) {
				var prettyURL = "";
			}

			var tabEl = getTabElement(tab.id);

			tabEl.find(".secondary-text").text(prettyURL);
		});

		$(document.body).addClass("is-expanded-mode");
		getWebview(tabs.getSelected()).blur();
		tabContainer.get(0).focus();

		isExpandedMode = true;
	}
}

function leaveExpandedMode() {
	if (isExpandedMode) {
		$(document.body).removeClass("is-expanded-mode");

		isExpandedMode = false;
	}
}

//when a tab is clicked, we want to minimize the tabstrip

tabContainer.on("click", ".tab-item", function () {
	if (isExpandedMode) {
		leaveExpandedMode();
		getWebview(tabs.getSelected())[0].focus();
	}
});
