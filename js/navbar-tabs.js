/* draws tabs and manages tab events */

var tabGroup = $(".tab-group #tabs");

function getTabElement(id) { //gets the DOM element for a tab
	return $(".tab-item[data-tab={id}]".replace("{id}", id))
}

//gets the input for a tab element

$.fn.getInput = function () {
	return this.find(".tab-input");
}

function setActiveTabElement(tabId) {
	$(".tab-item").removeClass("active");
	getTabElement(tabId).addClass("active");
}

function leaveTabEditMode(options) {
	$(".tab-item").removeClass("selected");
	options && options.blur && $(".tab-item .tab-input").blur();
	tabGroup.removeClass("has-selected-tab");
	hideAwesomebar();
}

function enterEditMode(tabId) {
	var tabEl = getTabElement(tabId);
	var webview = getWebview(tabId)[0];

	//when editing a tab, show the current page url. Sometimes, if the webview was just created, getting the URL can throw an error. If this happens, we fallback to whatever was there already.
	try {
		var currentUrl = webview.getUrl();
	} catch (e) {
		console.warn("failed to get webview URL");
		var currentUrl = null;
	}

	var input = tabEl.getInput();

	tabEl.addClass("selected");
	input.focus().val(currentUrl).select();
	showAwesomebar(input);
	tabGroup.addClass("has-selected-tab");
}

function rerenderTabElement(tabId) {
	console.log(tabId);
	var tabEl = getTabElement(tabId);

	var tabData = tabs.get(tabId);


	tabEl.find(".tab-view-contents .title").text(tabData.title || "New Tab");
	tabEl.find(".tab-view-contents i").remove(); //remove previous icons

	if (tabData.secure) {
		tabEl.find(".tab-view-contents").prepend("<i class='fa fa-lock'></i>");
	}

	if (tabData.private) {
		tabEl.find(".tab-view-contents").prepend("<i class='fa fa-ban'></i>").attr("title", "Private tab");
	}

	//update the star to reflect whether the page is bookmarked or not
	bookmarks.renderStar(tabId, tabEl.find(".bookmarks-button"));
}

function createTabElement(tabId) {
	console.log(tabId);
	var data = tabs.get(tabId),
		title = data.title || "Search or enter address",
		url = urlParser.parse(data.url);

	var tab = $("<div class='tab-item'>");
	tab.attr("data-tab", tabId);

	if (data.private) {
		tab.addClass("private-tab");
	}

	var input = $("<input class='tab-input theme-text-color mousetrap'>");
	input.attr("placeholder", title);
	input.attr("value", url);

	var ec = $("<div class='tab-edit-contents'>");

	input.appendTo(ec);

	bookmarks.getStar(tabId).appendTo(ec);

	ec.appendTo(tab);

	var vc = $("<div class='tab-view-contents theme-text-color'>")
	readerView.getButton(tabId).appendTo(vc);

	vc.append("<span class='title'>");
	vc.appendTo(tab);


	//events
	tab.on("click", function (e) {
		var tabId = $(this).attr("data-tab");

		//if the tab isn't focused
		if (tabs.getSelected() != tabId) {
			$(".tab-input").blur();
			switchToTab(tabId);
		} else { //the tab is focused, edit tab instead
			enterEditMode(tabId);
		}

	});

	/* events */

	input.on("keydown", function (e) {
		if (e.keyCode == 9 || e.keyCode == 40) { //if the tab or arrow down key was pressed
			focusAwesomebarItem();
			e.preventDefault();
		}
	})

	input.on("keyup", function (e) {
		if (e.keyCode == 13) { //return key pressed; update the url
			var tabId = $(this).parents(".tab-item").attr("data-tab");
			var newURL = $(this).val();

			navigate(tabId, newURL);

			switchToTab(tabId);


		} else if (e.keyCode == 9) {
			//tab key, do nothing - in keydown listener

		} else { //show the awesomebar
			showAwesomebarResults(input.val(), input, e.keyCode);
		}
	});

	//prevent clicking in the input from re-entering edit-tab mode

	input.on("click", function (e) {
		e.stopPropagation();
	});



	return tab;
}

function addTab(tabId, options) {
	/* options 
	
	options.focus - whether to enter editing mode when the tab is created. Defaults to true.
	options.openInBackground - whether to open the tab without switching to it. Defaults to false.
	
	*/

	options = options || {}
	leaveTabEditMode(); //if a tab is in edit-mode, we want to exit it

	tabId = tabId || tabs.add({
		backgroundColor: "",
		foregroundColor: ""
	});


	tabGroup.append(createTabElement(tabId));
	addWebview(tabId, {
		openInBackground: options.openInBackground, //if the tab is being opened in the background, the webview should be as well
	});

	//use the default colors while creating a tab


	//open in background - we don't want to enter edit mode or switch to tab

	if (options.openInBackground) {
		return;
	}

	setColor("", "");

	switchToTab(tabId);
	if (options.focus != false) {
		enterEditMode(tabId)
	}
}

//startup - add a tab. remove when session restore is complete

addTab();

//when we click outside the navbar, we leave editing mode

$(document.body).on("focus", "webview", function () {
	leaveTabEditMode();
});
