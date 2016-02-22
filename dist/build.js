/* tracks the state of tabs */

var tabs = {
	_state: {
		tabs: [],
		selected: null,
	},
	add: function (tab, index) {

		//make sure the tab exists before we create it
		if (!tab) {
			var tab = {};
		}

		var tabId = tab.id || Math.round(Math.random() * 100000000000000000); //you can pass an id that will be used, or a random one will be generated.

		var newTab = {
			url: tab.url || "",
			title: tab.title || "",
			id: tabId,
			lastActivity: tab.lastActivity || Date.now(),
			secure: tab.secure,
			private: tab.private || false,
			readerable: tab.readerable || false,
			backgroundColor: tab.backgroundColor,
			foregroundColor: tab.foregroundColor,
		}

		if (index) {
			tabs._state.tabs.splice(index, 0, newTab);
		} else {
			tabs._state.tabs.push(newTab);
		}


		return tabId;

	},
	update: function (id, data) {
		if (!tabs.get(id)) {
			throw new ReferenceError("Attempted to update a tab that does not exist.");
		}
		var index = -1;
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				index = i;
			}
		}
		for (var key in data) {
			if (data[key] == undefined) {
				throw new ReferenceError("Key " + key + " is undefined.");
			}
			tabs._state.tabs[index][key] = data[key];
		}
	},
	destroy: function (id) {
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				tabs._state.tabs.splice(i, 1);
				return i;
			}
		}
		return false;
	},
	get: function (id) {
		if (!id) { //no id provided, return an array of all tabs
			//it is important to deep-copy the tab objects when returning them. Otherwise, the original tab objects get modified when the returned tabs are modified (such as when processing a url).
			var tabsToReturn = [];
			for (var i = 0; i < tabs._state.tabs.length; i++) {
				tabsToReturn.push(JSON.parse(JSON.stringify(tabs._state.tabs[i])));
			}
			return tabsToReturn;
		}
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				return tabs._state.tabs[i]
			}
		}
		return undefined;
	},
	getIndex: function (id) {
		for (var i = 0; i < tabs._state.tabs.length; i++) {
			if (tabs._state.tabs[i].id == id) {
				return i;
			}
		}
		return -1;
	},
	getSelected: function () {
		return tabs._state.selected;
	},
	getAtIndex: function (index) {
		return tabs._state.tabs[index] || undefined;
	},
	setSelected: function (id) {
		if (!tabs.get(id)) {
			throw new ReferenceError("Attempted to select a tab that does not exist.");
		}
		tabs._state.selected = id;
	},
	count: function () {
		return tabs._state.tabs.length;
	},
	reorder: function (newOrder) { //newOrder is an array of [tabId, tabId] that indicates the order that tabs should be in
		tabs._state.tabs.sort(function (a, b) {
			return newOrder.indexOf(a.id) - newOrder.indexOf(b.id);
		});
	},
}

function isEmpty(tabList) {
	if (!tabList || tabList.length == 0) {
		return true;
	}

	if (tabList.length == 1 && (!tabList[0].url || tabList[0].url == "about:blank")) {
		return true;
	}

	return false;
}
;var urlParser = {
	searchBaseURL: "https://duckduckgo.com/?t=min&q=%s",
	startingWWWRegex: /www\.(.+\..+\/)/g,
	trailingSlashRegex: /\/$/g,
	isURL: function (url) {
		return url.indexOf("http://") == 0 || url.indexOf("https://") == 0 || url.indexOf("file://") == 0 || url.indexOf("about:") == 0 || url.indexOf("chrome:") == 0 || url.indexOf("data:") == 0;
	},
	isSystemURL: function (url) {
		return url.indexOf("chrome") == 0 || url.indexOf("about:") == 0;
	},
	removeProtocol: function (url) {
		if (!urlParser.isURL(url)) {
			return url;
		}

		var withoutProtocol = url.replace("http://", "").replace("https://", "").replace("file://", ""); //chrome:, about:, data: protocols intentionally not removed

		if (withoutProtocol.indexOf("www.") == 0) {
			return withoutProtocol.replace("www.", "");
		} else {
			return withoutProtocol;
		}
	},
	isURLMissingProtocol: function (url) {
		return url.indexOf(" ") == -1 && url.indexOf(".") > 0;
	},
	parse: function (url) {
		url = url.trim(); //remove whitespace common on copy-pasted url's

		if (!url) {
			return "";
		}
		//if the url starts with a (supported) protocol, do nothing
		if (urlParser.isURL(url)) {
			return url;
		}

		if (url.indexOf("view-source:") == 0) {
			var realURL = url.replace("view-source:", "");

			return "view-source:" + urlParser.parse(realURL);
		}

		//if the url doesn't have a space and has a ., assume it is a url without a protocol
		if (urlParser.isURLMissingProtocol(url)) {
			return "http://" + url;
		}
		//else, do a search
		return urlParser.searchBaseURL.replace("%s", encodeURIComponent(url));
	},
	prettyURL: function (url) {
		var urlOBJ = new URL(url);
		return (urlOBJ.hostname + urlOBJ.pathname).replace(urlParser.startingWWWRegex, "$1").replace(urlParser.trailingSlashRegex, "");
	},
	areEqual: function (url1, url2) {
		try {
			var obj1 = new URL(url1);
			var obj2 = new URL(url2);

			return obj1.hostname == obj2.hostname && obj1.pathname == obj2.pathname
		} catch (e) { //if either of the url's are invalid, the URL constructor will throw an error
			return url1 == url2;
		}
	}
}
;/* implements selecting webviews, switching between them, and creating new ones. */

var phishingWarningPage = "file://" + __dirname + "/pages/phishing/index.html"; //TODO move this somewhere that actually makes sense
var crashedWebviewPage = "file:///" + __dirname + "/pages/crash/index.html";
var errorPage = "file:///" + __dirname + "/pages/error/index.html"

var webviewBase = document.getElementById("webviews");
var webviewEvents = [];
var webviewIPC = [];

//this only affects newly created webviews, so all bindings should be done on startup

function bindWebviewEvent(event, fn) {
	webviewEvents.push({
		event: event,
		fn: fn,
	})
}

//function is called with (webview, tabId, IPCArguements)

function bindWebviewIPC(name, fn) {
	webviewIPC.push({
		name: name,
		fn: fn,
	})
}

function getWebviewDom(options) {

	var w = document.createElement("webview");
	w.setAttribute("preload", "dist/webview.min.js");

	if (options.url) {
		w.setAttribute("src", urlParser.parse(options.url));
	}

	w.setAttribute("data-tab", options.tabId);

	//if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
	//since tab IDs are unique, we can use them as partition names
	if (tabs.get(options.tabId).private == true) {
		w.setAttribute("partition", options.tabId);
	}

	//webview events

	webviewEvents.forEach(function (i) {
		w.addEventListener(i.event, i.fn);
	});

	w.addEventListener("page-favicon-updated", function (e) {
		var id = this.getAttribute("data-tab");
		updateTabColor(e.favicons, id);
	});

	w.addEventListener("page-title-set", function (e) {
		var tab = this.getAttribute("data-tab");
		tabs.update(tab, {
			title: e.title
		});
		rerenderTabElement(tab);
	});

	w.addEventListener("did-finish-load", function (e) {
		var tab = this.getAttribute("data-tab");
		var url = this.getAttribute("src"); //src attribute changes whenever a page is loaded

		if (url.indexOf("https://") === 0 || url.indexOf("about:") == 0 || url.indexOf("chrome:") == 0 || url.indexOf("file://") == 0) {
			tabs.update(tab, {
				secure: true,
				url: url,
			});
		} else {
			tabs.update(tab, {
				secure: false,
				url: url,
			});
		}

		var isInternalPage = url.indexOf(__dirname) != -1 && url.indexOf(readerView.readerURL) == -1

		if (tabs.get(tab).private == false && !isInternalPage) { //don't save to history if in private mode, or the page is a browser page
			bookmarks.updateHistory(tab);
		}

		rerenderTabElement(tab);

		this.send("loadfinish"); //works around an electron bug (https://github.com/atom/electron/issues/1117), forcing Chromium to always  create the script context

	});

	/*w.on("did-get-redirect-request", function (e) {
		console.log(e.originalEvent);
	});*/

	//open links in new tabs

	w.addEventListener("new-window", function (e) {
		var tab = this.getAttribute("data-tab");
		var currentIndex = tabs.getIndex(tabs.getSelected());

		var newTab = tabs.add({
			url: e.url,
			private: tabs.get(tab).private //inherit private status from the current tab
		}, currentIndex + 1);
		addTab(newTab, {
			enterEditMode: false,
			openInBackground: e.disposition == "background-tab", //possibly open in background based on disposition
		});
	});

	w.addEventListener("close", function (e) {
		var tabId = this.getAttribute("data-tab");
		var selTab = tabs.getSelected();
		var currentIndex = tabs.getIndex(tabId);
		var nextTab = tabs.getAtIndex(currentIndex - 1) || tabs.getAtIndex(currentIndex + 1);

		destroyTab(tabId);

		if (tabId == selTab) { //the tab being destroyed is the current tab, find another tab to switch to

			if (nextTab) {
				switchToTab(nextTab.id);
			} else {
				addTab();
			}
		}
	})


	// In embedder page. Send the text content to bookmarks when recieved.
	w.addEventListener('ipc-message', function (e) {
		var w = this;
		var tab = this.getAttribute("data-tab");

		webviewIPC.forEach(function (item) {
			if (item.name == e.channel) {
				item.fn(w, tab, e.args);
			}
		});

		if (e.channel == "bookmarksData") {
			bookmarks.onDataRecieved(e.args[0]);

		} else if (e.channel == "phishingDetected") {
			navigate(this.getAttribute("data-tab"), phishingWarningPage);
		}
	});

	w.addEventListener("contextmenu", webviewMenu.show);

	w.addEventListener("crashed", function (e) {
		var tabId = this.getAttribute("data-tab");

		destroyWebview(tabId);
		tabs.update(tabId, {
			url: crashedWebviewPage
		});

		addWebview(tabId);
		switchToWebview(tabId);
	});

	w.addEventListener("did-fail-load", function (e) {
		if (e.errorCode != -3 && e.validatedURL == e.target.getURL()) {
			navigate(this.getAttribute("data-tab"), errorPage + "?ec=" + encodeURIComponent(e.errorCode) + "&url=" + e.target.getURL());
		}
	});

	w.addEventListener("enter-html-full-screen", function (e) {
		this.classList.add("fullscreen");
	});

	w.addEventListener("leave-html-full-screen", function (e) {
		this.classList.remove("fullscreen");
	})

	return w;

}

/* options: openInBackground: should the webview be opened without switching to it? default is false. 
 */

var WebviewsWithHiddenClass = false;

function addWebview(tabId) {

	var tabData = tabs.get(tabId);

	var webview = getWebviewDom({
		tabId: tabId,
		url: tabData.url
	});

	//this is used to hide the webview while still letting it load in the background
	//webviews are hidden when added - call switchToWebview to show it
	webview.classList.add("hidden");

	webviewBase.appendChild(webview);
}

function switchToWebview(id) {
	var webviews = document.getElementsByTagName("webview");
	for (var i = 0; i < webviews.length; i++) {
		webviews[i].hidden = true;
	}

	var wv = getWebview(id);
	wv.classList.remove("hidden");
	wv.hidden = false;
}

function updateWebview(id, url) {
	getWebview(id).setAttribute("src", urlParser.parse(url));
}

function destroyWebview(id) {
	var w = document.querySelector('webview[data-tab="{id}"]'.replace("{id}", id));
	w.parentNode.removeChild(w);
}

function getWebview(id) {
	return document.querySelector('webview[data-tab="{id}"]'.replace("{id}", id));
}
;var remote, Menu, MenuItem, clipboard;

var webviewMenu = {
	cache: {
		event: null,
		webview: null,
	},
	loadFromContextData: function (IPCdata) {

		var tab = tabs.get(tabs.getSelected());

		var event = webviewMenu.cache.event;

		var menu = new Menu();

		//if we have a link (an image source or an href)
		if (IPCdata.src && !isFocusMode) { //new tabs can't be created in focus mode

			//show what the item is

			if (IPCdata.src.length > 60) {
				var caption = IPCdata.src.substring(0, 60) + "..."
			} else {
				var caption = IPCdata.src;
			}

			menu.append(new MenuItem({
				label: caption,
				enabled: false,
			}));
			menu.append(new MenuItem({
				label: 'Open in New Tab',
				click: function () {
					var newTab = tabs.add({
						url: IPCdata.src,
						private: tab.private,
					}, tabs.getIndex(tabs.getSelected()) + 1);

					addTab(newTab, {
						enterEditMode: false,
					});

					getWebview(newTab).focus();
				}
			}));

			//if the current tab isn't private, we want to provide an option to open the link in a private tab

			if (!tab.private) {
				menu.append(new MenuItem({
					label: 'Open in New Private Tab',
					click: function () {
						var newTab = tabs.add({
							url: IPCdata.src,
							private: true,
						}, tabs.getIndex(tabs.getSelected()) + 1)
						addTab(newTab, {
							enterEditMode: false,
						});

						getWebview(newTab).focus();
					}
				}));
			}

			menu.append(new MenuItem({
				type: "separator"
			}));

			menu.append(new MenuItem({
				label: 'Copy link',
				click: function () {
					clipboard.writeText(IPCdata.src);
				}
			}));
		}

		if (IPCdata.selection) {
			menu.append(new MenuItem({
				label: 'Copy',
				click: function () {
					clipboard.writeText(IPCdata.selection);
				}
			}));

			menu.append(new MenuItem({
				type: "separator"
			}));

			menu.append(new MenuItem({
				label: 'Search with DuckDuckGo',
				click: function () {
					var newTab = tabs.add({
						url: "https://duckduckgo.com/?t=min&q=" + encodeURIComponent(IPCdata.selection),
						private: tab.private,
					})
					addTab(newTab, {
						enterEditMode: false,
					});

					getWebview(newTab).focus();
				}
			}));
		}

		if (IPCdata.image) {
			menu.append(new MenuItem({
				label: 'View image',
				click: function () {
					navigate(webviewMenu.cache.tab, IPCdata.image);
				}
			}));
		}


		menu.append(new MenuItem({
			label: 'Inspect Element',
			click: function () {
				webviewMenu.cache.webview.inspectElement(event.x, event.y);
			}
		}));

		menu.popup(remote.getCurrentWindow());
	},
	/* cxevent: a contextmenu event. Can be a jquery event or a regular event. */
	show: function (cxevent) {

		if (!remote) { //we lazyload remote, so if it isn't loaded yet, call require()
			remote = require('remote');
			Menu = remote.require('menu');
			MenuItem = remote.require('menu-item');
			clipboard = require("clipboard")
		}

		var event = cxevent.originalEvent || cxevent;
		webviewMenu.cache.event = event;

		var currentTab = tabs.getSelected();
		var webview = getWebview(currentTab)

		webviewMenu.cache.tab = currentTab;
		webviewMenu.cache.webview = webview;

		webview.send("getContextData", {
			x: event.offsetX,
			y: event.offsetY,
		}); //some menu items require recieving data from the page
	}
}

bindWebviewIPC("contextData", function (webview, tabId, arguements) {
	webviewMenu.loadFromContextData(arguements[0]);
})
;/*
steps to creating a bookmark:

 - bookmarks.bookmark(tabId) is called
 - webview_preload.js sends an ipc to webviews.js
 - webviews.js detects the channel is "bookmarksData", and calls bookmarks.onDataRecieved(data)
 - The worker creates a bookmark, and adds it to the search index

*/

var bookmarks = {
	updateHistory: function (tabId) {
		setTimeout(function () { //this prevents pages that are immediately left from being saved to history, and also gives the page-favicon-updated event time to fire (so the colors saved to history are correct).
			var tab = tabs.get(tabId);
			if (tab) {
				var data = {
					url: tab.url,
					title: tab.title,
					color: tab.backgroundColor,
				}
				bookmarks.historyWorker.postMessage({
					action: "updateHistory",
					data: data
				});
			}

		}, 500);
	},
	currentCallback: function () {},
	onDataRecieved: function (data) {
		bookmarks.bookmarksWorker.postMessage({
			action: "addBookmark",
			data: data
		});
	},
	deleteBookmark: function (url) {
		bookmarks.bookmarksWorker.postMessage({
			action: "deleteBookmark",
			data: {
				url: url
			}
		});
	},
	deleteHistory: function (url) {
		bookmarks.historyWorker.postMessage({
			action: "deleteHistory",
			data: {
				url: url
			}
		});
	},
	searchBookmarks: function (text, callback) {
		bookmarks.currentCallback = callback; //save for later, we run in onMessage
		bookmarks.bookmarksWorker.postMessage({
			action: "searchBookmarks",
			text: text,
		});
	},
	searchHistory: function (text, callback) {
		bookmarks.currentHistoryCallback = callback; //save for later, we run in onMessage
		bookmarks.historyWorker.postMessage({
			action: "searchHistory",
			text: text,
		});
	},
	getHistorySuggestions: function (url, callback) {
		bookmarks.currentHistoryCallback = callback;
		bookmarks.historyWorker.postMessage({
			action: "getHistorySuggestions",
			text: url,
		});
	},
	onMessage: function (e) { //assumes this is from a search operation
		if (e.data.scope == "bookmarks") {
			//TODO this (and the rest) should use unique callback id's
			bookmarks.currentCallback(e.data.result);
		} else if (e.data.scope == "history") { //history search
			bookmarks.currentHistoryCallback(e.data.result);
		}
	},
	bookmark: function (tabId) {
		getWebview(tabId).send("sendData");
		//rest happens in onDataRecieved and worker
	},
	toggleBookmarked: function (tabId) { //toggles a bookmark. If it is bookmarked, delete the bookmark. Otherwise, add it.
		var url = tabs.get(tabId).url,
			exists = false;

		bookmarks.searchBookmarks(url, function (d) {

			d.forEach(function (item) {
				if (item.url == url) {
					exists = true;
				}
			});


			if (exists) {
				console.log("deleting bookmark " + tabs.get(tabId).url);
				bookmarks.deleteBookmark(tabs.get(tabId).url);
			} else {
				bookmarks.bookmark(tabId);
			}
		});
	},
	handleStarClick: function (star) {
		star.classList.toggle("fa-star");
		star.classList.toggle("fa-star-o");

		bookmarks.toggleBookmarked(star.getAttribute("data-tab"));
	},
	getStar: function (tabId) {
		var star = document.createElement("i");
		star.setAttribute("data-tab", tabId);
		star.className = "fa fa-star-o bookmarks-button theme-text-color"; //alternative icon is fa-bookmark

		star.addEventListener("click", function (e) {
			bookmarks.handleStarClick(e.target);
		});

		return bookmarks.renderStar(tabId, star);
	},
	renderStar: function (tabId, star) { //star is optional
		star = star || document.querySelector('.bookmarks-button[data-tab="{id}"]'.replace("{id}", tabId));

		var currentURL = tabs.get(tabId).url;

		if (!currentURL || currentURL == "about:blank") { //no url, can't be bookmarked
			star.hidden = true;
			return star;
		} else {
			star.hidden = false;
		}

		//check if the page is bookmarked or not, and update the star to match

		bookmarks.searchBookmarks(currentURL, function (results) {

			if (!results) {
				return;
			}

			var hasMatched = false;

			results.forEach(function (r) {
				if (r.url == currentURL) {
					hasMatched = true;
				}
			});

			if (hasMatched) {
				star.classList.remove("fa-star-o");
				star.classList.add("fa-star");
			} else {
				star.classList.remove("fa-star");
				star.classList.add("fa-star-o");
			}
		});
		return star;
	},
	init: function () {
		bookmarks.historyWorker = new Worker("js/bookmarkshistory/historyworker.js");
		bookmarks.historyWorker.onmessage = bookmarks.onMessage;

		bookmarks.bookmarksWorker = new Worker("js/bookmarkshistory/bookmarksworker.js");
		bookmarks.bookmarksWorker.onmessage = bookmarks.onMessage;
	},

}

bookmarks.init();
;/* common to webview, tabrenderer, etc */

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

function destroyTab(id) {

	var tabEl = getTabElement(id);
	tabEl.parentNode.removeChild(tabEl);

	var t = tabs.destroy(id); //remove from state - returns the index of the destroyed tab
	destroyWebview(id); //remove the webview

}

/* switches to a tab - update the webview, state, tabstrip, etc. */

function switchToTab(id, options) {

	options = options || {};

	/* tab switching disabled in focus mode */
	if (isFocusMode) {
		showFocusModeError();
		return;
	}

	leaveTabEditMode();

	tabs.setSelected(id);
	setActiveTabElement(id);
	switchToWebview(id);

	if (options.focusWebview != false && !isExpandedMode) { //trying to focus a webview while in expanded mode breaks the page
		getWebview(id).focus();
	}

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

	sessionRestore.save();

}
;var searchbarCachedText = "";
var METADATA_SEPARATOR = "·";
var didFireKeydownSelChange = false;
var currentsearchbarInput;

//swipe left on history items to delete them

var lastItemDeletion = Date.now();

//https://remysharp.com/2010/07/21/throttling-function-calls#

function throttle(fn, threshhold, scope) {
	threshhold || (threshhold = 250);
	var last,
		deferTimer;
	return function () {
		var context = scope || this;

		var now = +new Date,
			args = arguments;
		if (last && now < last + threshhold) {
			// hold on to it
			clearTimeout(deferTimer);
			deferTimer = setTimeout(function () {
				last = now;
				fn.apply(context, args);
			}, threshhold);
		} else {
			last = now;
			fn.apply(context, args);
		}
	};
}

function debounce(fn, delay) {
	var timer = null;
	return function () {
		var context = this,
			args = arguments;
		clearTimeout(timer);
		timer = setTimeout(function () {
			fn.apply(context, args);
		}, delay);
	};
}

function empty(node) {
	var n;
	while (n = node.firstElementChild) {
		node.removeChild(n);
	}
}

function removeTags(text) {
	return text.replace(/<.*?>/g, "");
}

/* this is used by navbar-tabs.js. When a url is entered, endings such as ? need to be parsed and removed. */
function parsesearchbarURL(url) {
	//always use a search engine if the query starts with "?"

	if (url.indexOf("?") == 0) {
		url = urlParser.searchBaseURL.replace("%s", encodeURIComponent(url.replace("?", "")));
	}

	if (url.indexOf("^") == 0) {
		url = url.replace("^", "");
	}

	if (url.indexOf("*") == 0) {
		url = url.replace("*", "");
	}

	return url;
}

function openURLInBackground(url) { //used to open a url in the background, without leaving the searchbar
	var newTab = tabs.add({
		url: url,
		private: tabs.get(tabs.getSelected()).private
	}, tabs.getIndex(tabs.getSelected()) + 1);
	addTab(newTab, {
		enterEditMode: false,
		openInBackground: true,
		leaveEditMode: false,
	});

	var i = searchbar.querySelector(".result-item:focus");
	if (i) { //remove the highlight from an awesomebar result item, if there is one
		i.blur();
	}
}

//when clicking on a result item, this function should be called to open the URL

function openURLFromsearchbar(event, url) {
	if (event.metaKey) {
		openURLInBackground(url);
		return true;
	} else {
		navigate(tabs.getSelected(), url);

		if (!tabs.get(tabs.getSelected()).private) {

			//show the color and title of the new page immediately, to make the page load time seem faster
			currentHistoryResults.forEach(function (res) {
				if (res.url == url) {
					setColor(res.color, getTextColor(getRGBObject(res.color)));
					tabs.update(tabs.getSelected(), {
						title: res.title,
					});
					rerenderTabElement(tabs.getSelected());
				}
			});

		}

		return false;
	}
}


//attempts to shorten a page title, removing useless text like the site name

function getRealTitle(text) {

	//don't try to parse URL's
	if (urlParser.isURL(text)) {
		return text;
	}

	var possibleCharacters = ["|", ":", " - ", " — "];

	for (var i = 0; i < possibleCharacters.length; i++) {

		var char = possibleCharacters[i];
		//match url's of pattern: title | website name
		var titleChunks = text.split(char);

		if (titleChunks.length >= 2) {
			titleChunks[0] = titleChunks[0].trim();
			titleChunks[1] = titleChunks[1].trim();

			if (titleChunks[1].length < 5 || titleChunks[1].length / titleChunks[0].length <= 0.5) {
				return titleChunks[0]
			}
		}
	}

	//fallback to the regular title

	return text;

}


//creates a result item

/*
	
data:
	
title: string - the title of the item
secondaryText: string - the item's secondary text
url: string - the item's url (if there is one).
icon: string - the name of a font awesome icon.
image: string - the URL of an image to show
descriptionBlock: string - the text in the description block,
attribution: string - attribution text to display when the item is focused
delete: function - a function to call to delete the result item when a left swipe is detected
	
classList: array - a list of classes to add to the item
*/

function createSearchbarItem(data) {
	var item = document.createElement("div");
	item.classList.add("result-item");

	item.setAttribute("tabindex", "-1");

	if (data.classList) {
		for (var i = 0; i < data.classList.length; i++) {
			item.classList.add(data.classList[i]);
		}
	}

	if (data.icon) {
		var i = document.createElement("i");
		i.className = "fa" + " " + data.icon;

		item.appendChild(i);
	}

	if (data.title) {
		var title = document.createElement("span");
		title.classList.add("title");

		title.textContent = data.title;

		item.appendChild(title);
	}


	if (data.url) {
		item.setAttribute("data-url", data.url);
	}

	if (data.secondaryText) {
		var secondaryText = document.createElement("span");
		secondaryText.classList.add("secondary-text");

		secondaryText.textContent = data.secondaryText;

		item.appendChild(secondaryText);
	}

	if (data.image) {
		var image = document.createElement("img");
		image.className = "result-icon image low-priority-image";
		image.src = data.image;

		if (data.imageIsInline) {
			image.classList.add("inline");
		}

		item.insertBefore(image, item.childNodes[0]);
	}

	if (data.descriptionBlock) {
		var dBlock = document.createElement("span");
		dBlock.classList.add("description-block");

		dBlock.textContent = data.descriptionBlock;
		item.appendChild(dBlock);
	}

	if (data.attribution) {
		var attrBlock = document.createElement("span");
		attrBlock.classList.add("attribution");

		attrBlock.textContent = data.attribution;
		item.appendChild(attrBlock);
	}

	if (data.delete) {
		item.addEventListener("mousewheel", function (e) {
			var self = this;
			if (e.deltaX > 50 && e.deltaY < 3 && Date.now() - lastItemDeletion > 700) {
				lastItemDeletion = Date.now();

				self.style.opacity = "0";
				self.style.transform = "translateX(-100%)";

				setTimeout(function () {
					data.delete(self);
					self.parentNode.removeChild(self);
					lastItemDeletion = Date.now();
				}, 200);
			}
		});
	}

	return item;
}

var searchbar = document.getElementById("searchbar");

function clearsearchbar() {
	empty(opentabarea);
	empty(topAnswerarea);
	empty(bookmarkarea);
	empty(historyarea);
	empty(iaarea);
	empty(suggestedsitearea);
	empty(serarea);

	//prevent memory leak
	cachedBangSnippets = {};
}

function showSearchbar(triggerInput) {

	currentACItem = null

	searchbarCachedText = triggerInput.value;
	document.body.classList.add("searchbar-shown");

	clearsearchbar();

	searchbar.hidden = false;

	currentsearchbarInput = triggerInput;

}

//gets the typed text in an input, ignoring highlighted suggestions

function getValue(input) {
	var text = input.value;
	return text.replace(text.substring(input.selectionStart, input.selectionEnd), "");
}

function hidesearchbar() {
	currentsearchbarInput = null;
	document.body.classList.remove("searchbar-shown");
	searchbar.hidden = true;
	cachedBangSnippets = {};
}
var showSearchbarResults = function (text, input, event) {
	if (event && event.metaKey) {
		return;
	}

	deleteKeyPressed = event && event.keyCode == 8;

	//find the real input value, accounting for highlighted suggestions and the key that was just pressed

	//delete key doesn't behave like the others, String.fromCharCode returns an unprintable character (which has a length of one)

	if (event && event.keyCode != 8) {

		text = text.substring(0, input.selectionStart) + String.fromCharCode(event.keyCode) + text.substring(input.selectionEnd, text.length);

	}

	console.log("searchbar: ", "'" + text + "'", text.length);

	//there is no text, show only topsites
	if (text.length < 1) {
		showHistoryResults("", input);
		clearsearchbar();
		return;
	}

	//when you start with ?, always search with duckduckgo

	if (text.indexOf("?") == 0) {
		clearsearchbar();

		currentSuggestionLimit = 5;
		showSearchSuggestions(text.replace("?", ""), input);
		return;
	}

	//when you start with ^, always search history (only)

	if (text.indexOf("^") == 0) {
		clearsearchbar();
		showHistoryResults(text.replace("^", ""), input);
		return;
	}

	//when you start with *, always search bookmarks (only)

	if (text.indexOf("*") == 0) {
		clearsearchbar();
		showBookmarkResults(text.replace("*", ""), input);
		return;
	}

	//show searchbar results

	showBookmarkResults(text);

	showHistoryResults(text, input);
	showInstantAnswers(text, input);
	searchOpenTabs(text, input);

	//update cache
	searchbarCachedText = text;
};

function focussearchbarItem(options) {
	options = options || {}; //fallback if options is null
	var previous = options.focusPrevious;

	var allItems = [].slice.call(searchbar.querySelectorAll(".result-item:not(.unfocusable)"));
	var currentItem = searchbar.querySelector(".result-item:focus, .result-item.fakefocus");

	var index = allItems.indexOf(currentItem);
	var logicalNextItem = allItems[(previous) ? index - 1 : index + 1];

	//clear previously focused items
	var fakefocus = searchbar.querySelector(".fakefocus");
	if (fakefocus) {
		fakefocus.classList.remove("fakefocus");
	}

	if (currentItem && logicalNextItem) { //an item is focused and there is another item after it, move onto the next one
		logicalNextItem.focus();
	} else if (currentItem) { //the last item is focused, focus the searchbar again
		getTabInput(tabs.getSelected()).focus();
		return;
	} else { // no item is focused.
		allItems[0].focus();
	}

	var focusedItem = logicalNextItem || allItems[0];

	if (focusedItem.classList.contains("iadata-onfocus")) {

		setTimeout(function () {
			if (document.activeElement == focusedItem) {
				var itext = focusedItem.querySelector(".title").textContent;

				showInstantAnswers(itext, currentsearchbarInput, {
					alwaysShow: true,
					destroyPrevious: false,
				});
			}
		}, 225);
	}
}

//return key on result items should trigger click 
//tab key or arrowdown key should focus next item
//arrowup key should focus previous item

searchbar.addEventListener("keydown", function (e) {
	if (e.keyCode == 13) {
		e.target.click();
	} else if (e.keyCode == 9 || e.keyCode == 40) { //tab or arrowdown key
		e.preventDefault();
		focussearchbarItem();
	} else if (e.keyCode == 38) {
		e.preventDefault();
		focussearchbarItem({
			focusPrevious: true
		});
	}
});

//when we get keywords data from the page, we show those results in the searchbar

bindWebviewIPC("keywordsData", function (webview, tabId, arguements) {

	var data = arguements[0];

	var itemsCt = 0;

	var itemsShown = [];


	data.entities.forEach(function (item, index) {

		//ignore one-word items, they're usually useless
		if (!/\s/g.test(item.trim())) {
			return;
		}

		if (itemsCt >= 5 || itemsShown.indexOf(item.trim()) != -1) {
			return;
		}

		var div = createSearchbarItem({
			icon: "fa-search",
			title: item,
			classList: ["iadata-onfocus"]
		});

		div.addEventListener("click", function (e) {
			if (e.metaKey) {
				openURLInBackground(item);
			} else {
				navigate(tabs.getSelected(), item);
			}
		});

		serarea.appendChild(div);

		itemsCt++;
		itemsShown.push(item.trim());
	});
});
;var DDGSearchURLRegex = /^https:\/\/duckduckgo.com\/\?q=([^&]*).*/g,
	trailingSlashRegex = /\/$/g,
	plusRegex = /\+/g;

var currentACItem = null;
var deleteKeyPressed = false;

var historyarea = searchbar.querySelector(".history-results");

var maxHistoryResults = 4;
var currentHistoryResults = null;

function searchbarAutocomplete(text, input, historyResults) {

	if (!text || deleteKeyPressed) {
		currentACItem = null;
		return;
	}

	if (text == searchbarCachedText && input.selectionStart != input.selectionEnd) { //if nothing has actually changed, don't try to autocomplete
		return;
	}
	//if we moved the selection, we don't want to autocomplete again
	if (didFireKeydownSelChange) {
		return;
	}

	currentACItem = null;

	var didAutocomplete = false;

	for (var i = 0; !didAutocomplete && i < historyResults.length; i++) { //we only want to autocomplete the first item that matches
		didAutocomplete = autocompleteResultIfNeeded(input, historyResults[i]); //this returns true or false depending on whether the item was autocompleted or not
	}
}

function autocompleteResultIfNeeded(input, result) {

	//figure out if we should autocomplete based on the title

	DDGSearchURLRegex.lastIndex = 0;
	shouldAutocompleteTitle = DDGSearchURLRegex.test(result.url);

	if (shouldAutocompleteTitle) {
		result.title = decodeURIComponent(result.url.replace(DDGSearchURLRegex, "$1").replace(plusRegex, " "));
	}

	var text = getValue(input); //make sure the input hasn't changed between start and end of query
	try {
		var hostname = new URL(result.url).hostname;
	} catch (e) {
		console.warn(result.url);
	}

	var possibleAutocompletions = [ //the different variations of the URL we can autocomplete
		hostname, //we start with the domain
		(hostname + "/").replace(urlParser.startingWWWRegex, "$1").replace("/", ""), //if that doesn't match, try the hostname without the www instead. The regex requires a slash at the end, so we add one, run the regex, and then remove it
		urlParser.prettyURL(result.url), //then try the whole url
		urlParser.removeProtocol(result.url), //then try the url with querystring
		result.url, //then just try the url with protocol
	]

	if (shouldAutocompleteTitle) {
		possibleAutocompletions.push(result.title);
	}


	for (var i = 0; i < possibleAutocompletions.length; i++) {
		if (possibleAutocompletions[i].toLowerCase().indexOf(text.toLowerCase()) == 0) { //we can autocomplete the item

			input.value = possibleAutocompletions[i];
			input.setSelectionRange(text.length, possibleAutocompletions[i].length);

			if (i < 2) { //if we autocompleted a domain, the cached item should be the domain, not the full url
				var url = new URL(result.url);
				currentACItem = url.protocol + "//" + url.hostname + "/";
			} else {
				currentACItem = result.url;
			}
			return true;
		}
	}

	//nothing was autocompleted

	return false;
}

var showHistoryResults = throttle(function (text, input, maxItems) {

		if (!text && input.value) { //if the entire input is highlighted (such as when we first focus the input), don't show anything
			return;
		}

		if (text) {
			text = text.trim();
		}

		//if we're offline, the only sites that will work are reader articles, so we should show those as top sites

		if (!text && !navigator.onLine) {
			readerView.showReadingList({
				limitResults: true
			});
			return;
		}

		if (text.indexOf("!") == 0) {
			empty(historyarea);
			showSearchSuggestions(text, input, 5);
			return; //never show history results for bang search
		}

		var fn = bookmarks.searchHistory;

		var searchText = text;

		//if there is no search text, show suggested sites instead
		if (!searchText) {
			fn = bookmarks.getHistorySuggestions;
			searchText = tabs.get(tabs.getSelected()).url;

			//current tab is empty
			var idx = tabs.getIndex(tabs.getSelected());
			if ((!searchText || searchText == "about:blank") && idx > 0) {
				searchText = tabs.getAtIndex(idx - 1).url;
			}
		}

		fn(searchText, function (results) {

			currentHistoryResults = results;

			var showedTopAnswer = false;

			maxItems = maxItems || maxHistoryResults;

			//if there is no text, only history results will be shown, so we can assume that 4 results should be shown.
			if (!text) {
				maxItems = 4;

				//don't show sites currently open as site suggestions

				var tabList = tabs.get().map(function (tab) {
					return tab.url;
				});
				results = results.filter(function (item) {
					return tabList.indexOf(item.url) == -1;
				});
			}

			empty(historyarea);

			if (topAnswerarea.getElementsByClassName("history-item").length > 0) {
				empty(topAnswerarea);
			}

			searchbarAutocomplete(text, input, results);

			if (results.length < 10) {
				maxItems = 3;
				showSearchSuggestions(text, input, 5 - results.length);
			} else {
				empty(serarea);
			}

			var resultsShown = 0;

			//we will never have more than 5 results, so we don't need to create more DOM elements than that

			requestAnimationFrame(function () {

				results.slice(0, 4).forEach(function (result) {

					DDGSearchURLRegex.lastIndex = 0;
					var isDDGSearch = DDGSearchURLRegex.test(result.url);

					var itemDeleteFunction = function (el) {
						bookmarks.deleteHistory(el.getAttribute("data-url"));
					}


					if (isDDGSearch) { //show the result like a search suggestion

						var processedTitle = decodeURIComponent(result.url.replace(DDGSearchURLRegex, "$1").replace(plusRegex, " "));

						var data = {
							icon: "fa-search",
							title: processedTitle,
							url: result.url,
							classList: ["history-item"],
							delete: itemDeleteFunction,
						}
					} else {
						var data = {
							icon: "fa-globe",
							title: getRealTitle(result.title) || result.url,
							url: result.url,
							classList: ["history-item"],
							delete: itemDeleteFunction,
						}

						if (result.title !== result.url) {
							data.secondaryText = urlParser.prettyURL(result.url);
						}
					}


					var item = createSearchbarItem(data);

					item.addEventListener("click", function (e) {
						openURLFromsearchbar(e, result.url);
					});

					if (resultsShown >= maxItems) { //only show up to n history items
						item.hidden = true;
						item.classList.add("unfocusable");
					}

					if (urlParser.areEqual(currentACItem, result.url) && resultsShown < maxItems && !showedTopAnswer) { //the item is being autocompleted, highlight it
						item.classList.add("fakefocus");
						topAnswerarea.appendChild(item);
						showedTopAnswer = true;
					} else {
						historyarea.appendChild(item)
					}


					resultsShown++;

				});

				//show a top answer item if we did domain autocompletion

				if (currentACItem && !showedTopAnswer && !DDGSearchURLRegex.test(currentACItem)) {
					var item = createSearchbarItem({
						classList: ["history-item", "fakefocus"],
						icon: "fa-globe",
						title: urlParser.prettyURL(currentACItem),
						url: currentACItem,
					});

					item.addEventListener("click", function (e) {
						openURLFromsearchbar(e, currentACItem);
					});

					topAnswerarea.appendChild(item);
				}
			});

		});
	},
	50);

function limitHistoryResults(maxItems) {
	maxHistoryResults = Math.min(4, Math.max(maxItems, 2));

	var limitAmt = maxHistoryResults;

	if (topAnswerarea.getElementsByClassName("history-item")[0]) {
		limitAmt--;
	}

	var itemsToHide = historyarea.querySelectorAll(".result-item:nth-child(n+{items})".replace("{items}", limitAmt + 1));

	for (var i = 0; i < itemsToHide.length; i++) {
		itemsToHide[i].hidden = true;
		itemsToHide[i].classList.add("unfocusable");
	}
}
;var bookmarkarea = searchbar.querySelector(".bookmark-results");

function addBookmarkItem(result) {

	//create the basic item
	//getRealTitle is defined in searchbar.js

	var item = createSearchbarItem({
		icon: "fa-star",
		title: getRealTitle(result.title),
		secondaryText: urlParser.prettyURL(result.url),
		url: result.url,
	});

	item.addEventListener("click", function (e) {
		openURLFromsearchbar(e, result.url);
	});

	if (result.extraData && result.extraData.metadata) {

		var secondaryText = item.querySelector(".secondary-text");

		for (var md in result.extraData.metadata) {
			var span = document.createElement("span");

			span.className = "md-info";
			span.textContent = result.extraData.metadata[md];

			secondaryText.insertBefore(span, secondaryText.firstChild)
		}

	}

	bookmarkarea.appendChild(item);
}

var showBookmarkResults = debounce(function (text) {
	if (text.length < 5 || text.indexOf("!") == 0) { //if there is not enough text, or we're doing a bang search, don't show results
		limitHistoryResults(5);
		empty(bookmarkarea);
		return;
	}

	bookmarks.searchBookmarks(text, function (results) {
		empty(bookmarkarea);
		var resultsShown = 1;
		results.splice(0, 2).forEach(function (result) {

			//if a history item for the same page already exists, don't show a bookmark
			if (searchbar.querySelector('.result-item[data-url="{url}"]:not([hidden])'.replace("{url}", result.url))) {
				return;
			}

			//as more results are added, the threshold for adding another one gets higher
			if ((result.score > Math.max(0.0004, 0.0016 - (0.00012 * Math.pow(1.3, text.length))) || text.length > 25) && (resultsShown == 1 || text.length > 6)) {
				requestAnimationFrame(function () {
					addBookmarkItem(result);
				});
				resultsShown++;
			}

		});

		//if we have lots of bookmarks, don't show as many regular history items
		if (resultsShown == 3) {
			limitHistoryResults(3);
		} else {
			limitHistoryResults(4);
		}

	});
}, 133);

var showAllBookmarks = function () {
	bookmarks.searchBookmarks("", function (results) {

		results.sort(function (a, b) {
			//http://stackoverflow.com/questions/6712034/sort-array-by-firstname-alphabetically-in-javascript
			if (a.url < b.url) return -1;
			if (a.url > b.url) return 1;
			return 0;
		});
		results.forEach(addBookmarkItem);
	});
}
;var bangRegex = /!\w+/g;
var serarea = searchbar.querySelector(".search-engine-results");
var iaarea = searchbar.querySelector(".instant-answer-results");
var topAnswerarea = searchbar.querySelector(".top-answer-results");
var suggestedsitearea = searchbar.querySelector("#searchbar .ddg-site-results");

var ddgAttribution = "Results from DuckDuckGo";

//cache duckduckgo bangs so we make fewer network requests
var cachedBangSnippets = {};

//format is {bang: count}
var bangUseCounts = JSON.parse(localStorage.getItem("bangUseCounts") || "{}");

function removeAllDDGAnswers() {
	var a = searchbar.querySelectorAll(".ddg-answer");
	for (var i = 0; i < a.length; i++) {
		a[i].parentNode.removeChild(a[i]);
	}
}

function incrementBangCount(bang) {
	//increment bangUseCounts

	if (bangUseCounts[bang]) {
		bangUseCounts[bang]++;
	} else {
		bangUseCounts[bang] = 1;
	}

	//prevent the data from getting too big

	if (bangUseCounts[bang] > 1000) {
		for (var bang in bangUseCounts) {
			bangUseCounts[bang] = Math.floor(bangUseCounts[bang] * 0.9);

			if (bangUseCounts[bang] < 2) {
				delete bangUseCounts[bang];
			}
		}
	}
}

var saveBangUseCounts = debounce(function () {
	localStorage.setItem("bangUseCounts", JSON.stringify(bangUseCounts));
}, 10000);

/* custom answer layouts */

var IAFormats = {
	color_code: function (searchText, answer) {
		var alternateFormats = [answer.data.rgb, answer.data.hslc, answer.data.cmyb];

		if (!searchText.startsWith("#")) { //if the search is not a hex code, show the hex code as an alternate format
			alternateFormats.unshift(answer.data.hexc);
		}

		var item = createSearchbarItem({
			title: searchText,
			descriptionBlock: alternateFormats.join(" " + METADATA_SEPARATOR + " "),
			classList: ["indent", "ddg-answer"],
			attribution: ddgAttribution,
		});

		var colorCircle = document.createElement("div");
		colorCircle.className = "result-icon color-circle";
		colorCircle.style.backgroundColor = "#" + answer.data.hex_code;

		item.insertBefore(colorCircle, item.firstChild);

		return item;
	},
	minecraft: function (searchText, answer) {

		var item = createSearchbarItem({
			title: answer.data.title,
			image: answer.data.image,
			descriptionBlock: answer.data.description + " " + answer.data.subtitle,
			classList: ["indent", "ddg-answer"],
			attribution: ddgAttribution,
		});

		return item;
	},
	figlet: function (searchText, answer) {
		var formattedAnswer = removeTags(answer).replace("Font: standard", "");

		var item = createSearchbarItem({
			descriptionBlock: formattedAnswer,
			classList: ["indent", "ddg-answer"],
			attribution: ddgAttribution,
		});

		var block = item.querySelector(".description-block");

		//display the data correctly
		block.style.whiteSpace = "pre-wrap";
		block.style.fontFamily = "monospace";
		block.style.maxHeight = "10em";
		block.style.webkitUserSelect = "auto";

		return item;

	},
	currency_in: function (searchText, answer) {
		var title = "";
		if (typeof answer == "string") { //there is only one currency
			title = answer;
		} else { //multiple currencies
			var currencyArr = []
			for (var countryCode in answer.data.record_data) {
				currencyArr.push(answer.data.record_data[countryCode] + " (" + countryCode + ")");
			}

			title = currencyArr.join(", ");
		}

		if (answer.data) {
			var descriptionBlock = answer.data.title;
		} else {
			var descriptionBlock = "Answer";
		}

		var item = createSearchbarItem({
			title: title,
			descriptionBlock: descriptionBlock,
			classList: ["indent", "ddg-answer"],
			attribution: ddgAttribution,
		});

		return item;
	},
}

//this is triggered from history.js - we only show search suggestions if we don't have history results
window.showSearchSuggestions = throttle(function (text, input, itemsToShow) {

	if (!text || tabs.get(tabs.getSelected()).private) { //we don't show search suggestions in private tabs, since this would send typed text to DDG
		return;
	}

	itemsToShow = Math.max(2, itemsToShow);

	fetch("https://ac.duckduckgo.com/ac/?t=min&q=" + encodeURIComponent(text), {
			cache: "force-cache"
		})
		.then(function (response) {
			return response.json();
		})
		.then(function (results) {

			empty(serarea);

			if (results && results[0] && results[0].snippet) { //!bang search - ddg api doesn't have a good way to detect this

				results.sort(function (a, b) {
					var aScore = a.score || 1;
					var bScore = b.score || 1;
					if (bangUseCounts[a.phrase]) {
						aScore *= bangUseCounts[a.phrase];
					}
					if (bangUseCounts[b.phrase]) {
						bScore *= bangUseCounts[b.phrase];
					}

					return bScore - aScore;
				});

				results.slice(0, 5).forEach(function (result) {
					cachedBangSnippets[result.phrase] = result.snippet;

					//autocomplete the bang, but allow the user to keep typing

					var data = {
						image: result.image,
						imageIsInline: true,
						title: result.snippet,
						secondaryText: result.phrase
					}

					var item = createSearchbarItem(data);

					item.addEventListener("click", function () {
						setTimeout(function () {
							incrementBangCount(result.phrase);
							saveBangUseCounts();

							input.value = result.phrase + " ";
							input.focus();
						}, 66);
					});

					serarea.appendChild(item);
				});

			} else if (results) {
				results.splice(0, itemsToShow).forEach(function (result) {

					var data = {
						title: result.phrase,
						classList: ["iadata-onfocus"],
					}

					if (bangRegex.test(result.phrase)) {

						data.title = result.phrase.replace(bangRegex, "");

						var bang = result.phrase.match(bangRegex)[0];

						incrementBangCount(bang);
						saveBangUseCounts();

						data.secondaryText = "Search on " + cachedBangSnippets[bang];
					}

					if (urlParser.isURL(result.phrase) || urlParser.isURLMissingProtocol(result.phrase)) { //website suggestions
						data.icon = "fa-globe";
					} else { //regular search results
						data.icon = "fa-search";
					}

					var item = createSearchbarItem(data);

					item.addEventListener("click", function (e) {
						openURLFromsearchbar(e, result.phrase);
					});

					serarea.appendChild(item);
				});
			}
		});

}, 350);

window.showInstantAnswers = debounce(function (text, input, options) {

	options = options || {};

	if (!text) {
		empty(iaarea);
		empty(suggestedsitearea);
		return;
	}

	//don't make useless queries
	if (urlParser.isURLMissingProtocol(text)) {
		return;
	}

	//don't send typed text in private mode
	if (tabs.get(tabs.getSelected()).private) {
		return;
	}

	if (text.length > 3) {

		fetch("https://api.duckduckgo.com/?t=min&skip_disambig=1&no_redirect=1&format=json&q=" + encodeURIComponent(text))
			.then(function (data) {
				return data.json();
			})
			.then(function (res) {

				//if value has changed, don't show results
				if (text != getValue(input) && !options.alwaysShow) {
					return;
				}

				//if there is a custom format for the answer, use that
				if (IAFormats[res.AnswerType]) {
					var item = IAFormats[res.AnswerType](text, res.Answer);

				} else if (res.Abstract || res.Answer) {

					var data = {
						title: removeTags(res.Answer || res.Heading),
						descriptionBlock: res.Abstract || "Answer",
						classList: ["ddg-answer", "indent"],
						attribution: ddgAttribution,
					}

					if (res.Image && !res.ImageIsLogo) {
						data.image = res.Image;
					}

					var item = createSearchbarItem(data);
				}

				if (options.destroyPrevious != false || item) {
					removeAllDDGAnswers();
				}

				if (item) {
					item.addEventListener("click", function (e) {
						openURLFromsearchbar(e, res.AbstractURL || text);
					});

					//answers are more relevant, they should be displayed at the top
					if (res.Answer) {
						empty(topAnswerarea);
						topAnswerarea.appendChild(item);
					} else {
						iaarea.appendChild(item);
					}

				}

				//suggested site links


				if (res.Results && res.Results[0] && res.Results[0].FirstURL && currentHistoryResults.length < 11) {

					var url = res.Results[0].FirstURL;

					var data = {
						icon: "fa-globe",
						title: urlParser.removeProtocol(url).replace(trailingSlashRegex, ""),
						secondaryText: "Suggested site",
						url: url,
						classList: ["ddg-answer"],
					}

					var item = createSearchbarItem(data);

					item.addEventListener("click", function (e) {
						openURLFromsearchbar(e, res.Results[0].FirstURL);
					});

					suggestedsitearea.appendChild(item);
				}

				//if we're showing a location, show a "Search on OpenStreetMap" link

				var entitiesWithLocations = ["location", "country", "u.s. state", "protected area"];

				if (entitiesWithLocations.indexOf(res.Entity) != -1) {

					var item = createSearchbarItem({
						icon: "fa-search",
						title: res.Heading,
						secondaryText: "Search on OpenStreetMap",
						classList: ["ddg-answer"]
					});

					item.addEventListener("click", function (e) {
						openURLFromsearchbar(e, "https://www.openstreetmap.org/search?query=" + encodeURIComponent(res.Heading));
					});

					iaarea.insertBefore(item, iaarea.firstChild);
				}


			})
			.catch(function (e) {
				console.error(e);
			});
	} else {
		removeAllDDGAnswers(); //we still want to remove old items, even if we didn't make a new request
	}

}, 450);
;var spacesRegex = /[\s._/-]/g; //copied from historyworker.js
var opentabarea = searchbar.querySelector(".opentab-results");

var stringScore = require("string_score");

var searchOpenTabs = function (searchText) {

	requestAnimationFrame(function () {

		empty(opentabarea);

		if (searchText.length < 3) {
			return;
		}

		var matches = [],
			selTab = tabs.getSelected();

		tabs.get().forEach(function (item) {
			if (item.id == selTab || !item.title || item.url == "about:blank") {
				return;
			}

			var itemUrl = urlParser.removeProtocol(item.url); //don't search protocols

			var exactMatch = item.title.indexOf(searchText) != -1 || itemUrl.indexOf(searchText) != -1
			var fuzzyMatch = item.title.substring(0, 50).score(searchText, 0.5) > 0.4 || itemUrl.score(searchText, 0.5) > 0.4;

			if (exactMatch || fuzzyMatch) {
				matches.push(item);
			}
		});

		matches.splice(0, 2).sort(function (a, b) {
			return b.title.score(searchText, 0.5) - a.title.score(searchText, 0.5);
		}).forEach(function (tab) {
			var data = {
				icon: "fa-external-link-square",
				title: tab.title,
				secondaryText: urlParser.removeProtocol(tab.url).replace(trailingSlashRegex, "")
			}

			var item = createSearchbarItem(data);

			item.addEventListener("click", function () {
				//if we created a new tab but are switching away from it, destroy the current (empty) tab
				var currentTabUrl = tabs.get(tabs.getSelected()).url;
				if (!currentTabUrl || currentTabUrl == "about:blank") {
					destroyTab(tabs.getSelected(), {
						switchToTab: false
					});
				}
				switchToTab(tab.id);
			});

			opentabarea.appendChild(item);
		});
	});
}
;var readerView = {
	readerURL: "file://" + __dirname + "/reader/index.html",
	getReaderURL: function (url) {
		return readerView.readerURL + "?url=" + url;
	},
	getButton: function (tabId) {
		//TODO better icon
		var item = document.createElement("i");
		item.className = "fa fa-align-left reader-button";

		item.setAttribute("data-tab", tabId);
		item.setAttribute("title", "Enter reader view");

		item.addEventListener("click", function (e) {
			var tabId = this.getAttribute("data-tab");
			var tab = tabs.get(tabId);

			e.stopPropagation();

			if (tab.isReaderView) {
				readerView.exit(tabId);
			} else {
				readerView.enter(tabId);
			}
		});

		return item;
	},
	updateButton: function (tabId) {
		var button = document.querySelector('.reader-button[data-tab="{id}"]'.replace("{id}", tabId));
		var tab = tabs.get(tabId);

		if (tab.isReaderView) {
			button.classList.add("is-reader");
			button.setAttribute("title", "Exit reader view");
			return;
		} else {
			button.classList.remove("is-reader");
			button.setAttribute("title", "Enter reader view");
		}

		if (tab.readerable) {
			button.classList.add("can-reader");
		} else {
			button.classList.remove("can-reader");
		}
	},
	enter: function (tabId) {
		navigate(tabId, readerView.readerURL + "?url=" + tabs.get(tabId).url);
		tabs.update(tabId, {
			isReaderView: true
		});
	},
	exit: function (tabId) {
		navigate(tabId, tabs.get(tabId).url.split("?url=")[1]);
		tabs.update(tabId, {
			isReaderView: false
		});
	},
	showReadingList: function (options) {

		showSearchbar(getTabInput(tabs.getSelected()));

		var articlesShown = 0;
		var moreArticlesAvailable = false;

		db.readingList.orderBy("time").reverse().each(function (article) {
			if (!article.article) {
				return;
			}
			if (options && options.limitResults && articlesShown > 3) {
				moreArticlesAvailable = true;
				return;
			}

			if (articlesShown == 0) {
				clearsearchbar();
			}

			var item = createSearchbarItem({
				title: article.article.title,
				descriptionBlock: article.article.excerpt,
				url: article.url,
				delete: function (el) {
					db.readingList.where("url").equals(el.getAttribute("data-url")).delete();
				}
			});

			item.addEventListener("click", function (e) {
				openURLFromsearchbar(e, readerView.getReaderURL(article.url));
			});

			if (article.visitCount > 5 || (article.extraData.scrollPosition > 0 && article.extraData.articleScrollLength - article.extraData.scrollPosition < 1000)) { //the article has been visited frequently, or the scroll position is at the bottom
				item.style.opacity = 0.65;
			}

			historyarea.appendChild(item);

			articlesShown++;
		}).then(function () {

			if (articlesShown == 0) {
				var item = createSearchbarItem({
					title: "Your reading list is empty.",
					descriptionBlock: "Articles you open in reader view are listed here, and are saved offline for 30 days."
				});

				historyarea.appendChild(item);
				return;
			}

			if (moreArticlesAvailable) {

				var seeMoreLink = createSearchbarItem({
					title: "More articles",
				});

				seeMoreLink.style.opacity = 0.5;

				seeMoreLink.addEventListener("click", function (e) {
					clearsearchbar();
					readerView.showReadingList({
						limitResults: false
					});
				});

				historyarea.appendChild(seeMoreLink);
			}
		});
	},
}

//update the reader button on page load

bindWebviewEvent("did-finish-load", function (e) {
	var tab = this.getAttribute("data-tab"),
		url = this.getAttribute("src");

	if (url.indexOf(readerView.readerURL) == 0) {
		tabs.update(tab, {
			isReaderView: true,
			readerable: false, //assume the new page can't be readered, we'll get another message if it can
		})
	} else {
		tabs.update(tab, {
			isReaderView: false,
			readerable: false,
		})
	}

	readerView.updateButton(tab);

});

bindWebviewIPC("canReader", function (webview, tab) {
	tabs.update(tab, {
		readerable: true
	});
	readerView.updateButton(tab);
});
;/* fades out tabs that are inactive */

var tabActivity = {
	minFadeAge: 330000,
	refresh: function () {

		requestAnimationFrame(function () {
			var tabSet = tabs.get(),
				selected = tabs.getSelected(),
				time = Date.now();


			tabSet.forEach(function (tab) {
				if (selected == tab.id) { //never fade the current tab
					getTabElement(tab.id).classList.remove("fade");
					return;
				}
				if (time - tab.lastActivity > tabActivity.minFadeAge) { //the tab has been inactive for greater than minActivity, and it is not currently selected
					getTabElement(tab.id).classList.add("fade");
				} else {
					getTabElement(tab.id).classList.remove("fade");
				}
			});
		});
	},
	init: function () {
		setInterval(tabActivity.refresh, 7500);
	}
}
tabActivity.init();
;function getColor(url, callback) {

	colorExtractorImage.onload = function (e) {
		var canvas = document.createElement("canvas");
		var context = canvas.getContext("2d");

		var w = colorExtractorImage.width,
			h = colorExtractorImage.height;
		canvas.width = w
		canvas.height = h

		var offset = Math.max(1, Math.round(0.00032 * w * h));

		context.drawImage(colorExtractorImage, 0, 0, w, h);

		var data = context.getImageData(0, 0, w, h).data;

		var pixels = {};

		var d, add, sum;

		for (var i = 0; i < data.length; i += 4 * offset) {
			d = Math.round(data[i] / 5) * 5 + "," + Math.round(data[i + 1] / 5) * 5 + "," + Math.round(data[i + 2] / 5) * 5;

			add = 1;
			sum = data[i] + data[i + 1] + data[i + 2]

			//very dark or light pixels shouldn't be counted as heavily
			if (sum < 310) {
				add = 0.35;
			}

			if (sum < 50) {
				add = 0.01;
			}

			if (data[i] > 210 || data[i + 1] > 210 || data[i + 2] > 210) {
				add = 0.5 - (0.0001 * sum)
			}

			if (pixels[d]) {
				pixels[d] = pixels[d] + add;
			} else {
				pixels[d] = add;
			}
		}

		//find the largest pixel set
		var largestPixelSet = null;
		var ct = 0;

		for (var k in pixels) {
			if (k == "255,255,255" || k == "0,0,0") {
				pixels[k] *= 0.05;
			}
			if (pixels[k] > ct) {
				largestPixelSet = k;
				ct = pixels[k];
			}
		}

		var res = largestPixelSet.split(",");

		for (var i = 0; i < res.length; i++) {
			res[i] = parseInt(res[i]);
		}

		callback(res);

	}

	colorExtractorImage.src = url;
}

var colorExtractorImage = document.createElement("img");

const defaultColors = {
	private: ["rgb(58, 44, 99)", "white"],
	regular: ["rgb(255, 255, 255)", "black"]
}

var hours = new Date().getHours() + (new Date().getMinutes() / 60);

//we cache the hours so we don't have to query every time we change the color

setInterval(function () {
	var d = new Date();
	hours = d.getHours() + (d.getMinutes() / 60);
}, 4 * 60 * 1000);

function updateTabColor(favicons, tabId) {

	//special color scheme for private tabs
	if (tabs.get(tabId).private == true) {
		tabs.update(tabId, {
			backgroundColor: "#3a2c63",
			foregroundColor: "white",
		})

		if (tabId == tabs.getSelected()) {
			setColor("#3a2c63", "white");
		}
		return;
	}
	requestIdleCallback(function () {
		getColor(favicons[0], function (c) {

			//dim the colors late at night or early in the morning
			var colorChange = 1;
			if (hours > 20) {
				colorChange -= 0.015 * Math.pow(2.75, hours - 20);
			} else if (hours < 6.5) {
				colorChange -= -0.15 * Math.pow(1.36, hours) + 1.15
			}

			c[0] = Math.round(c[0] * colorChange)
			c[1] = Math.round(c[1] * colorChange)
			c[2] = Math.round(c[2] * colorChange)


			var cr = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";

			var obj = {
				r: c[0] / 255,
				g: c[1] / 255,
				b: c[2] / 255,
			}

			var textclr = getTextColor(obj);

			tabs.update(tabId, {
				backgroundColor: cr,
				foregroundColor: textclr,
			})

			if (tabId == tabs.getSelected()) {
				setColor(cr, textclr);
			}
			return;
		});
	}, {
		timeout: 1000
	});

}

//generated using http://harthur.github.io/brain/
var getTextColor = function (bgColor) {
	var output = runNetwork(bgColor);
	if (output.black > .5) {
		return 'black';
	}
	return 'white';
}

var runNetwork = function anonymous(input
	/**/
) {
	var net = {
		"layers": [{
			"r": {},
			"g": {},
			"b": {}
		}, {
			"0": {
				"bias": 14.176907520571566,
				"weights": {
					"r": -3.2764240497480652,
					"g": -16.90247884718719,
					"b": -2.9976364179397814
				}
			},
			"1": {
				"bias": 9.086071102351246,
				"weights": {
					"r": -4.327474143397604,
					"g": -15.780660155750773,
					"b": 2.879230202567851
				}
			},
			"2": {
				"bias": 22.274487339773476,
				"weights": {
					"r": -3.5830205067960965,
					"g": -25.498384261673618,
					"b": -6.998329189107962
				}
			}
		}, {
			"black": {
				"bias": 17.873962570788997,
				"weights": {
					"0": -15.542217788633987,
					"1": -13.377152708685674,
					"2": -24.52215186113144
				}
			}
		}],
		"outputLookup": true,
		"inputLookup": true
	};

	for (var i = 1; i < net.layers.length; i++) {
		var layer = net.layers[i];
		var output = {};

		for (var id in layer) {
			var node = layer[id];
			var sum = node.bias;

			for (var iid in node.weights) {
				sum += node.weights[iid] * input[iid];
			}
			output[id] = (1 / (1 + Math.exp(-sum)));
		}
		input = output;
	}
	return output;
}

function setColor(bg, fg) {
	var background = document.getElementsByClassName("theme-background-color");
	var textcolor = document.getElementsByClassName("theme-text-color");

	for (var i = 0; i < background.length; i++) {
		background[i].style.backgroundColor = bg;
	}

	for (var i = 0; i < textcolor.length; i++) {
		textcolor[i].style.color = fg;
	}

	if (fg == "white") {
		document.body.classList.add("dark-theme");
	} else {
		document.body.classList.remove("dark-theme");
	}
}

/* converts a color string into an object that can be used with getTextColor */

function getRGBObject(cssColor) {
	var c = cssColor.split("(")[1].split(")")[0]
	var c2 = c.split(",");

	var obj = {
		r: parseInt(c2[0]) / 255,
		g: parseInt(c2[1]) / 255,
		b: parseInt(c2[2]) / 255,
	}

	return obj;

}
;var tabContainer = document.getElementsByClassName("tab-group")[0];
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
});
;/* provides simple utilities for entering/exiting expanded tab mode */

var tabDragArea = tabGroup;

require.async("dragula", function (dragula) {

	window.dragRegion = dragula();

	//reorder the tab state when a tab is dropped
	dragRegion.on("drop", function () {

		var tabOrder = [];

		var tabElements = tabContainer.querySelectorAll(".tab-item");

		for (var i = 0; i < tabElements.length; i++) {
			var tabId = parseInt(tabElements[i].getAttribute("data-tab"));
			tabOrder.push(tabId);
		}

		tabs.reorder(tabOrder);
	});

});

tabContainer.addEventListener("mousewheel", function (e) {
	if (e.deltaY < -30 && e.deltaX < 10) { //swipe down to expand tabs
		enterExpandedMode();
		e.stopImmediatePropagation();
	}
});

//event listener added in navbarTabs.js
function handleExpandedModeTabItemHover(e) {
	if (isExpandedMode) {
		var item = this;
		setTimeout(function () {
			if (item.matches(":hover")) {
				switchToTab(item.getAttribute("data-tab"));
			}
		}, 125);
	}
}

var isExpandedMode = false;

function enterExpandedMode() {
	if (!isExpandedMode) {

		dragRegion.containers = [tabDragArea]; //only allow dragging tabs in expanded mode

		leaveTabEditMode();

		//get the subtitles

		tabs.get().forEach(function (tab) {
			var prettyURL = urlParser.prettyURL(tab.url);

			console.log(tab);

			getTabElement(tab.id).querySelector(".secondary-text").textContent = prettyURL;
		});

		requestAnimationFrame(function () {

			document.body.classList.add("is-expanded-mode");
			tabContainer.focus();

		});

		isExpandedMode = true;
	}
}

function leaveExpandedMode() {
	if (isExpandedMode) {
		dragRegion.containers = [];
		document.body.classList.remove("is-expanded-mode");

		isExpandedMode = false;
	}
}

//when a tab is clicked, we want to minimize the tabstrip

tabContainer.addEventListener("click", function () {
	if (isExpandedMode) {
		leaveExpandedMode();
		getWebview(tabs.getSelected()).focus();
	}
});
;var addTabButton = document.getElementById("add-tab-button");

addTabButton.addEventListener("click", function (e) {
	var newTab = tabs.add({}, tabs.getIndex(tabs.getSelected()) + 1);
	addTab(newTab);
});
;/* defines keybindings that aren't in the menu (so they aren't defined by menu.js). For items in the menu, also handles ipc messages */

ipc.on("zoomIn", function () {
	getWebview(tabs.getSelected()).send("zoomIn");
});

ipc.on("zoomOut", function () {
	getWebview(tabs.getSelected()).send("zoomOut");
});

ipc.on("zoomReset", function () {
	getWebview(tabs.getSelected()).send("zoomReset");
});

ipc.on("print", function () {
	getWebview(tabs.getSelected()).print();
})

ipc.on("findInPage", function () {
	findinpage.start();
})

ipc.on("inspectPage", function () {
	getWebview(tabs.getSelected()).openDevTools();
});

ipc.on("showReadingList", function () {
	readerView.showReadingList();
})

ipc.on("addTab", function (e) {

	/* new tabs can't be created in focus mode */
	if (isFocusMode) {
		showFocusModeError();
		return;
	}

	var newIndex = tabs.getIndex(tabs.getSelected()) + 1;
	var newTab = tabs.add({}, newIndex);
	addTab(newTab);
});

function addPrivateTab() {


	/* new tabs can't be created in focus mode */
	if (isFocusMode) {
		showFocusModeError();
		return;
	}


	if (isEmpty(tabs.get())) {
		destroyTab(tabs.getAtIndex(0).id);
	}

	var newIndex = tabs.getIndex(tabs.getSelected()) + 1;

	var privateTab = tabs.add({
		url: "about:blank",
		private: true,
	}, newIndex)
	addTab(privateTab);
}

ipc.on("addPrivateTab", addPrivateTab);

require.async("mousetrap", function (Mousetrap) {
	window.Mousetrap = Mousetrap;

	Mousetrap.bind("shift+command+p", addPrivateTab);

	Mousetrap.bind(["command+l", "command+k"], function (e) {
		enterEditMode(tabs.getSelected());
		return false;
	})

	Mousetrap.bind("command+w", function (e) {

		//prevent command+w from closing the window
		e.preventDefault();
		e.stopImmediatePropagation();


		/* disabled in focus mode */
		if (isFocusMode) {
			showFocusModeError();
			return;
		}

		var currentTab = tabs.getSelected();
		var currentIndex = tabs.getIndex(currentTab);
		var nextTab = tabs.getAtIndex(currentIndex - 1) || tabs.getAtIndex(currentIndex + 1);

		destroyTab(currentTab);
		if (nextTab) {
			switchToTab(nextTab.id);
		} else {
			addTab();
		}

		if (tabs.count() == 1) { //there isn't any point in being in expanded mode any longer
			leaveExpandedMode();
		}

		return false;
	});

	Mousetrap.bind("command+d", function (e) {
		bookmarks.handleStarClick(getTabElement(tabs.getSelected()).querySelector(".bookmarks-button"));
		enterEditMode(tabs.getSelected()); //we need to show the bookmarks button, which is only visible in edit mode
	});

	// cmd+x should switch to tab x. Cmd+9 should switch to the last tab

	for (var i = 1; i < 9; i++) {
		(function (i) {
			Mousetrap.bind("command+" + i, function (e) {
				var currentIndex = tabs.getIndex(tabs.getSelected());
				var newTab = tabs.getAtIndex(currentIndex + i) || tabs.getAtIndex(currentIndex - i);
				if (newTab) {
					switchToTab(newTab.id);
				}
			})

			Mousetrap.bind("shift+command+" + i, function (e) {
				var currentIndex = tabs.getIndex(tabs.getSelected());
				var newTab = tabs.getAtIndex(currentIndex - i) || tabs.getAtIndex(currentIndex + i);
				if (newTab) {
					switchToTab(newTab.id);
				}
			})

		})(i);
	}

	Mousetrap.bind("command+9", function (e) {
		switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
	})

	Mousetrap.bind("shift+command+9", function (e) {
		switchToTab(tabs.getAtIndex(0).id);
	})

	Mousetrap.bind("esc", function (e) {
		leaveTabEditMode();
		leaveExpandedMode();
		getWebview(tabs.getSelected()).focus();
	});

	Mousetrap.bind("shift+command+r", function () {
		var tab = tabs.get(tabs.getSelected());

		if (tab.isReaderView) {
			readerView.exit(tab.id);
		} else {
			readerView.enter(tab.id);
		}
	});

	//TODO add help docs for this

	Mousetrap.bind("command+left", function (d) {
		getWebview(tabs.getSelected()).goBack();
	});

	Mousetrap.bind("command+right", function (d) {
		getWebview(tabs.getSelected()).goForward();
	});

	Mousetrap.bind(["option+command+left", "shift+ctrl+tab"], function (d) {

		enterExpandedMode(); //show the detailed tab switcher

		var currentIndex = tabs.getIndex(tabs.getSelected());
		var previousTab = tabs.getAtIndex(currentIndex - 1);

		if (previousTab) {
			switchToTab(previousTab.id);
		} else {
			switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
		}
	});

	Mousetrap.bind(["option+command+right", "ctrl+tab"], function (d) {

		enterExpandedMode();

		var currentIndex = tabs.getIndex(tabs.getSelected());
		var nextTab = tabs.getAtIndex(currentIndex + 1);

		if (nextTab) {
			switchToTab(nextTab.id);
		} else {
			switchToTab(tabs.getAtIndex(0).id);
		}
	});

	Mousetrap.bind("command+n", function (d) { //destroys all current tabs, and creates a new, empty tab. Kind of like creating a new window, except the old window disappears.

		var tset = tabs.get();
		for (var i = 0; i < tset.length; i++) {
			destroyTab(tset[i].id);
		}

		addTab(); //create a new, blank tab
	});

	//return exits expanded mode

	Mousetrap.bind("return", function () {
		if (isExpandedMode) {
			leaveExpandedMode();
			getWebview(tabs.getSelected()).focus();
		}
	});

	Mousetrap.bind("shift+command+e", function () {
		if (!isExpandedMode) {
			enterExpandedMode();
		} else {
			leaveExpandedMode();
		}
	});

	Mousetrap.bind("shift+command+b", function () {
		clearsearchbar();
		showSearchbar(getTabInput(tabs.getSelected()));
		enterEditMode(tabs.getSelected());
		showAllBookmarks();
	});

}); //end require mousetrap

document.body.addEventListener("keyup", function (e) {
	if (e.keyCode == 17) { //ctrl key
		leaveExpandedMode();
	}
});
;/* handles viewing pdf files using pdf.js. Recieves events from main.js will-download */

var PDFViewerURL = "file://" + __dirname + "/pdfjs/web/viewer.html?url=";

ipc.on("openPDF", function (event, filedata) {
	console.log("opening PDF", filedata);

	var PDFurl = PDFViewerURL + filedata.url,
		hasOpenedPDF = false;

	// we don't know which tab the event came from, so we loop through each tab to find out.

	tabs.get().forEach(function (tab) {
		if (tab.url == filedata.url) {
			navigate(tab.id, PDFurl);
			hasOpenedPDF = true;
		}
	});

	if (!hasOpenedPDF) {
		var newTab = tabs.add({
			url: PDFurl
		}, tabs.getIndex(tabs.getSelected()) + 1);

		addTab(newTab, {
			enterEditMode: false
		});

		getWebview(newTab).focus();
	}
});
;var findinpage = {
	container: document.getElementById("findinpage-bar"),
	isEnabled: false,
	start: function (options) {
		findinpage.container.hidden = false;
		findinpage.isEnabled = true;
		findinpage.input.focus();
		findinpage.input.select();
	},
	end: function (options) {
		findinpage.container.hidden = true;
		findinpage.isEnabled = false;

		//focus the webview

		if (findinpage.input == document.activeElement) {
			getWebview(tabs.getSelected()).focus();
		}
	},
	toggle: function () {
		if (findinpage.isEnabled) {
			findinpage.end();
		} else {
			findinpage.start();
		}
	},
	escape: function (text) { //removes apostrophes from text so we can safely embed it in a string
		return text.replace(/'/g, "\\'");
	}
}

findinpage.input = findinpage.container.querySelector(".findinpage-input");

findinpage.input.addEventListener("keyup", function (e) {
	//escape key should exit find mode, not continue searching
	if (e.keyCode == 27) {
		findinpage.end();
		return;
	}
	var text = findinpage.escape(this.value);
	var webview = getWebview(tabs.getSelected());

	//this stays on the current text if it still matches, preventing flickering. However, if the return key was pressed, we should move on to the next match instead, so this shouldn't run.
	if (e.keyCode != 13) {
		webview.executeJavaScript("window.getSelection().empty()");
	}

	webview.executeJavaScript("find('{t}', false, false, true, false, false, false)".replace("{t}", text)); //see https://developer.mozilla.org/en-US/docs/Web/API/Window/find for a description of the parameters
});

findinpage.input.addEventListener("blur", function (e) {
	findinpage.end();
});
;var sessionRestore = {
	save: function () {
		requestIdleCallback(function () {
			var data = {
				version: 1,
				tabs: [],
				selected: tabs._state.selected,
			}

			//save all tabs that aren't private

			tabs.get().forEach(function (tab) {
				if (!tab.private) {
					data.tabs.push(tab);
				}
			});

			localStorage.setItem("sessionrestoredata", JSON.stringify(data));
		}, {
			timeout: 2250
		});
	},
	restore: function () {
		//get the data

		try {
			var data = localStorage.getItem("sessionrestoredata");

			//first run, show the tour
			if (!data) {
				var newTab = tabs.add({
					url: "https://palmeral.github.io/min/tour"
				});
				addTab(newTab, {
					enterEditMode: false,
				});
				return;
			}

			data = JSON.parse(data);

			localStorage.setItem("sessionrestoredata", "{}");

			if (data.version && data.version != 1) { //if the version isn't compatible, we don't want to restore.
				addTab(tabs.add(), {
					leaveEditMode: false //we know we aren't in edit mode yet, so we don't have to leave it
				});
				return;
			}

			console.info("restoring tabs", data.tabs);

			if (isEmpty(data.tabs)) { //If there are no tabs, or if we only have one tab, and it's about:blank, don't restore
				addTab(tabs.add(), {
					leaveEditMode: false
				});
				return;
			}

			//actually restore the tabs
			data.tabs.forEach(function (tab, index) {
				var newTab = tabs.add(tab);
				addTab(newTab, {
					openInBackground: true,
					leaveEditMode: false,
					focus: false,
				});

			});

			//set the selected tab

			if (tabs.get(data.selected)) { //if the selected tab was a private tab that we didn't restore, it's possible that the selected tab doesn't actually exist. This will throw an error, so we want to make sure the tab exists before we try to switch to it
				switchToTab(data.selected);
			} else { //switch to the first tab
				switchToTab(data.tabs[0].id);
			}

		} catch (e) {
			//if we can't restore the session, try to start over with a blank tab
			console.warn("failed to restore session, rolling back");
			console.error(e);

			localStorage.setItem("sessionrestoredata", "{}");

			setTimeout(function () {
				window.location.reload();
			}, 500);

		}
	}
}

//TODO make this a preference

sessionRestore.restore();

setInterval(sessionRestore.save, 12500);
;var isFocusMode = false;

ipc.on("enterFocusMode", function () {
	isFocusMode = true;
	document.body.classList.add("is-focus-mode");

	setTimeout(function () { //wait to show the message until the tabs have been hidden, to make the message less confusing
		electron.remote.require("dialog").showMessageBox({
			type: "info",
			buttons: ["OK"],
			message: "You're in focus mode.",
			detail: 'In focus mode, all tabs except the current one are hidden, and you can\'t create new tabs. You can leave focus mode by unchecking "focus mode" from the view menu.'
		});
	}, 16);

});

ipc.on("exitFocusMode", function () {
	isFocusMode = false;
	document.body.classList.remove("is-focus-mode");
});

function showFocusModeError() {
	electron.remote.require("dialog").showMessageBox({
		type: "info",
		buttons: ["OK"],
		message: "You're in focus mode.",
		detail: 'You can leave focus mode by unchecking "focus mode" in the view menu.'
	});
}
