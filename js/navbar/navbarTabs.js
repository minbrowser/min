var tabContainer = document.getElementsByClassName("tab-group")[0];
var tabGroup = tabContainer.querySelector("#tabs"); //TODO these names are confusing

/* tab events */

var lastTabDeletion = 0;

/* draws tabs and manages tab events */

function getTabInput(tabId) {
	return document.querySelector('.tab-item[data-tab="{id}"] .tab-input'.replace("{id}", tabId));
}

function getTabElement(id) { //gets the DOM element for a tab
	return document.querySelector('.tab-item[data-tab="{id}"]'.replace("{id}", id));
}

function setActiveTabElement(tabId) {
	var activeTab = document.querySelector(".tab-item.active");

	if (activeTab) {
		activeTab.classList.remove("active");
	}

	var el = getTabElement(tabId);
	el.classList.add("active");

	if (tabs.count() > 1) { //if there is only one tab, we don't need to indicate which one is selected
		el.classList.add("has-highlight");
	} else {
		el.classList.remove("has-highlight");
	}

	if (!isExpandedMode) {

		requestIdleCallback(function () {
			requestAnimationFrame(function () {
				el.scrollIntoView({
					behavior: "smooth"
				});
			});
		}, {
			timeout: 1500
		});

	}

}

function leaveTabEditMode(options) {
	var selTab = document.querySelector(".tab-item.selected");
	if (selTab) {
		selTab.classList.remove("selected");
	}
	if (options && options.blur) {
		var input = document.querySelector(".tab-item .tab-input:focus")
		if (input) {
			input.blur();
		}
	}
	tabGroup.classList.remove("has-selected-tab");
	hidesearchbar();
}

function enterEditMode(tabId) {

	leaveExpandedMode();

	var tabEl = getTabElement(tabId);
	var webview = getWebview(tabId);

	var currentURL = tabs.get(tabId).url;

	if (currentURL == "about:blank") {
		currentURL = "";
	}

	var input = getTabInput(tabId);

	tabEl.classList.add("selected");
	tabGroup.classList.add("has-selected-tab");

	input.value = currentURL;
	input.focus();
	input.select();

	showSearchbar(input);
	showSearchbarResults("", input, null);

	//show keyword suggestions in the searchbar

	if (webview.send) { //before first webview navigation, this will be undefined
		webview.send("getKeywordsData");
	}
}

function rerenderTabElement(tabId) {
	var tabEl = getTabElement(tabId),
		tabData = tabs.get(tabId);

	var tabTitle = tabData.title || "New Tab";
	var title = tabEl.querySelector(".tab-view-contents .title");

	title.textContent = tabTitle;
	title.title = tabTitle;

	var secIcon = tabEl.getElementsByClassName("icon-tab-not-secure")[0];

	if (tabData.secure === false) {
		if (!secIcon) {
			var vc = tabEl.querySelector(".tab-view-contents");
			vc.insertAdjacentHTML("afterbegin", "<i class='fa fa-exclamation-triangle icon-tab-not-secure' title='Your connection to this website is not secure.'></i>");
		}
	} else if (secIcon) {
		secIcon.parentNode.removeChild(secIcon);
	}

	//update the star to reflect whether the page is bookmarked or not
	bookmarks.renderStar(tabId);
}

function createTabElement(tabId) {
	var data = tabs.get(tabId),
		url = urlParser.parse(data.url);

	var tabEl = document.createElement("div");
	tabEl.className = "tab-item";
	tabEl.setAttribute("data-tab", tabId);

	if (data.private) {
		tabEl.classList.add("private-tab");
	}

	var ec = document.createElement("div");
	ec.className = "tab-edit-contents";

	var input = document.createElement("input");
	input.className = "tab-input mousetrap";
	input.setAttribute("placeholder", "Search or enter address");
	input.value = url;

	ec.appendChild(input);
	ec.appendChild(bookmarks.getStar(tabId));

	tabEl.appendChild(ec);

	var vc = document.createElement("div");
	vc.className = "tab-view-contents";
	vc.appendChild(readerView.getButton(tabId));

	if (data.private) {
		vc.insertAdjacentHTML("afterbegin", "<i class='fa fa-ban icon-tab-is-private'></i>");
		vc.setAttribute("title", "Private tab");
	}

	var title = document.createElement("span");
	title.className = "title";
	title.textContent = data.title || "New Tab";

	vc.appendChild(title);

	vc.insertAdjacentHTML("beforeend", "<span class='secondary-text'></span>");
	tabEl.appendChild(vc);

	/* events */

	input.addEventListener("keydown", function (e) {
		if (e.keyCode == 9 || e.keyCode == 40) { //if the tab or arrow down key was pressed
			focussearchbarItem();
			e.preventDefault();
		}
	});

	//keypress doesn't fire on delete key - use keyup instead
	input.addEventListener("keyup", function (e) {
		if (e.keyCode == 8) {
			showSearchbarResults(this.value, this, e);
		}
	});

	input.addEventListener("keypress", function (e) {

		if (e.keyCode == 13) { //return key pressed; update the url
			var newURL = currentACItem || parsesearchbarURL(this.value);

			openURLFromsearchbar(e, newURL);

			//focus the webview, so that autofocus inputs on the page work
			getWebview(tabs.getSelected()).focus();

		} else if (e.keyCode == 9) {
			return;
			//tab key, do nothing - in keydown listener
		} else if (e.keyCode == 16) {
			return;
			//shift key, do nothing
		} else if (e.keyCode == 8) {
			return;
			//delete key is handled in keyUp
		} else { //show the searchbar
			showSearchbarResults(this.value, this, e);
		}

		//on keydown, if the autocomplete result doesn't change, we move the selection instead of regenerating it to avoid race conditions with typing. Adapted from https://github.com/patrickburke/jquery.inlineComplete

		var v = String.fromCharCode(e.keyCode).toLowerCase();
		var sel = this.value.substring(this.selectionStart, this.selectionEnd).indexOf(v);

		if (v && sel == 0) {
			this.selectionStart += 1;
			didFireKeydownSelChange = true;
			e.preventDefault();
		} else {
			didFireKeydownSelChange = false;
		}
	});

	//prevent clicking in the input from re-entering edit-tab mode

	input.addEventListener("click", function (e) {
		e.stopPropagation();
	});


	//click to enter edit mode or switch to a tab
	tabEl.addEventListener("click", function (e) {
		var tabId = this.getAttribute("data-tab");

		//if the tab isn't focused
		if (tabs.getSelected() != tabId) {
			switchToTab(tabId);
		} else if (!isExpandedMode) { //the tab is focused, edit tab instead
			enterEditMode(tabId);
		}

	});

	tabEl.addEventListener("mousewheel", function (e) {
		if (e.deltaY > 65 && e.deltaX < 10 && Date.now() - lastTabDeletion > 650) { //swipe up to delete tabs

			lastTabDeletion = Date.now();

			/* tab deletion is disabled in focus mode */
			if (isFocusMode) {
				showFocusModeError();
				return;
			}

			var tab = this.getAttribute("data-tab");
			this.style.transform = "translateY(-100%)";

			setTimeout(function () {

				if (tab == tabs.getSelected()) {
					var currentIndex = tabs.getIndex(tabs.getSelected());
					var nextTab = tabs.getAtIndex(currentIndex - 1) || tabs.getAtIndex(currentIndex + 1);

					destroyTab(tab);

					if (nextTab) {
						switchToTab(nextTab.id);
					} else {
						addTab();
					}

				} else {
					destroyTab(tab);
				}

			}, 150); //wait until the animation has completed
		}
	});

	tabEl.addEventListener("mouseenter", handleExpandedModeTabItemHover);

	return tabEl;
}

function addTab(tabId, options) {

	/* options 
	
						options.focus - whether to enter editing mode when the tab is created. Defaults to true.
						options.openInBackground - whether to open the tab without switching to it. Defaults to false.
						options.leaveEditMode - whether to hide the searchbar when creating the tab
	
						*/

	options = options || {};

	if (options.leaveEditMode != false) {
		leaveTabEditMode(); //if a tab is in edit-mode, we want to exit it
	}

	tabId = tabId || tabs.add();

	var tab = tabs.get(tabId);

	//use the correct new tab colors

	if (tab.private && !tab.backgroundColor) {
		tabs.update(tabId, {
			backgroundColor: defaultColors.private[0],
			foregroundColor: defaultColors.private[1]
		});
	} else if (!tab.backgroundColor) {
		tabs.update(tabId, {
			backgroundColor: defaultColors.regular[0],
			foregroundColor: defaultColors.regular[1]
		});
	}

	findinpage.end();

	var index = tabs.getIndex(tabId);

	var tabEl = createTabElement(tabId);

	tabGroup.insertBefore(tabEl, tabGroup.childNodes[index]);

	addWebview(tabId);

	//open in background - we don't want to enter edit mode or switch to tab

	if (options.openInBackground) {
		return;
	}

	switchToTab(tabId, {
		focusWebview: false
	});

	if (options.enterEditMode != false) {
		enterEditMode(tabId)
	}
}

//startup state is created in sessionRestore.js

//when we click outside the navbar, we leave editing mode

bindWebviewEvent("focus", function () {
	leaveExpandedMode();
	leaveTabEditMode();
	findinpage.end();
});
