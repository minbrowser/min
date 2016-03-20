var navbar = document.getElementsByClassName("tab-group")[0];
var tabContainer = navbar.querySelector("#tabs");

var lastTabDeletion = 0; //this is used in the tab event listeners

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

	if (currentTask.tabs.count() > 1) { //if there is only one tab, we don't need to indicate which one is selected
		el.classList.add("has-highlight");
	} else {
		el.classList.remove("has-highlight");
	}

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

//redraws all of the tabs in the tabstrip
function rerenderTabstrip() {
	empty(tabContainer);
	for (var i = 0; i < currentTask.tabs.length; i++) {
		tabContainer.appendChild(createTabElement(currentTask.tabs[i]));
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
	tabContainer.classList.remove("has-selected-tab");
	hidesearchbar();
}

function enterEditMode(tabId) {

	leaveExpandedMode();

	var tabEl = getTabElement(tabId),
		webview = getWebview(tabId),
		input = getTabInput(tabId);

	var currentURL = currentTask.tabs.get(tabId).url;

	if (currentURL == "about:blank") {
		currentURL = "";
	}

	tabEl.classList.add("selected");
	tabContainer.classList.add("has-selected-tab");

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
		tabData = currentTask.tabs.get(tabId);

	var tabTitle = tabData.title || "New Tab",
		titleElement = tabEl.querySelector(".tab-view-contents .title");

	titleElement.textContent = tabTitle;
	titleElement.title = tabTitle;

	var notSecureIcon = tabEl.getElementsByClassName("icon-tab-not-secure")[0];

	if (tabData.secure === false) {
		if (!notSecureIcon) {
			tabEl.querySelector(".tab-view-contents").insertAdjacentHTML("afterbegin", "<i class='fa fa-exclamation-triangle icon-tab-not-secure' title='Your connection to this website is not secure.'></i>");
		}
	} else if (notSecureIcon) {
		notSecureIcon.parentNode.removeChild(notSecureIcon);
	}

	//update the star to reflect whether the page is bookmarked or not
	bookmarks.renderStar(tabId);
}

function createTabElement(tabData) {
	var url = urlParser.parse(tabData.url);

	var tabEl = document.createElement("div");
	tabEl.className = "tab-item";
	tabEl.setAttribute("data-tab", tabData.id);

	if (tabData.private) {
		tabEl.classList.add("private-tab");
	}

	var ec = document.createElement("div");
	ec.className = "tab-edit-contents";

	var input = document.createElement("input");
	input.className = "tab-input mousetrap";
	input.setAttribute("placeholder", "Search or enter address");
	input.value = url;

	ec.appendChild(input);
	ec.appendChild(bookmarks.getStar(tabData.id));

	tabEl.appendChild(ec);

	var vc = document.createElement("div");
	vc.className = "tab-view-contents";
	vc.appendChild(readerView.getButton(tabData.id));

	if (tabData.private) {
		vc.insertAdjacentHTML("afterbegin", "<i class='fa fa-ban icon-tab-is-private'></i>");
		vc.setAttribute("title", "Private tab");
	}

	var title = document.createElement("span");
	title.className = "title";
	title.textContent = tabData.title || "New Tab";

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

			openURLFromsearchbar(e, this.value);

			//focus the webview, so that autofocus inputs on the page work
			getWebview(currentTask.tabs.getSelected()).focus();

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
			e.preventDefault();
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
		if (currentTask.tabs.getSelected() != tabId) {
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

				if (tab == currentTask.tabs.getSelected()) {
					var currentIndex = currentTask.tabs.getIndex(currentTask.tabs.getSelected());
					var nextTab = currentTask.tabs.getAtIndex(currentIndex - 1) || currentTask.tabs.getAtIndex(currentIndex + 1);

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

	tabId = tabId || currentTask.tabs.add();

	var tab = currentTask.tabs.get(tabId);

	//use the correct new tab colors

	if (tab.private && !tab.backgroundColor) {
		currentTask.tabs.update(tabId, {
			backgroundColor: defaultColors.private[0],
			foregroundColor: defaultColors.private[1]
		});
	} else if (!tab.backgroundColor) {
		currentTask.tabs.update(tabId, {
			backgroundColor: defaultColors.regular[0],
			foregroundColor: defaultColors.regular[1]
		});
	}

	findinpage.end();

	var index = currentTask.tabs.getIndex(tabId);

	var tabEl = createTabElement(tab);

	tabContainer.insertBefore(tabEl, tabContainer.childNodes[index]);

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
