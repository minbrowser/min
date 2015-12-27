/* implements selecting webviews, switching between them, and creating new ones. */

var phishingWarningPage = "file://" + __dirname + "/pages/phishing/index.html"; //TODO move this somewhere that actually makes sense
var crashedWebviewPage = "file:///" + __dirname + "/pages/crash/index.html";
var errorPage = "file:///" + __dirname + "/pages/error/index.html"

var webviewBase = $("#webviews");
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

	var url = (options || {}).url || "about:blank";

	var w = $("<webview>");
	w.attr("preload", "dist/webview.min.js");
	w.attr("src", urlParser.parse(url));

	w.attr("data-tab", options.tabId);

	//if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
	//since tab IDs are unique, we can use them as partition names
	if (tabs.get(options.tabId).private == true) {
		w.attr("partition", options.tabId);
	}

	//webview events

	webviewEvents.forEach(function (i) {
		w.on(i.event, i.fn);
	})

	w.on("page-favicon-updated", function (e) {
		var id = $(this).attr("data-tab");
		updateTabColor(e.originalEvent.favicons, id);
	});

	w.on("page-title-set", function (e) {
		var tab = $(this).attr("data-tab");
		tabs.update(tab, {
			title: e.originalEvent.title
		});
		rerenderTabElement(tab);
	});

	w.on("did-finish-load", function (e) {
		var tab = $(this).attr("data-tab");
		var url = $(this).attr("src"); //src attribute changes whenever a page is loaded

		if (url.indexOf("https://") === 0) {
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

	w.on("new-window", function (e) {
		var tab = $(this).attr("data-tab");
		var currentIndex = tabs.getIndex(tabs.getSelected());

		var newTab = tabs.add({
			url: e.originalEvent.url,
			private: tabs.get(tab).private //inherit private status from the current tab
		}, currentIndex + 1);
		addTab(newTab, {
			focus: false,
			openInBackground: e.originalEvent.disposition == "background-tab", //possibly open in background based on disposition
		});
	});


	// In embedder page. Send the text content to bookmarks when recieved.
	w.on('ipc-message', function (e) {
		var w = this;
		var tab = $(this).attr("data-tab");

		webviewIPC.forEach(function (item) {
			if (item.name == e.originalEvent.channel) {
				item.fn(w, tab, e.originalEvent.args);
			}
		});

		if (e.originalEvent.channel == "bookmarksData") {
			bookmarks.onDataRecieved(e.originalEvent.args[0]);

		} else if (e.originalEvent.channel == "phishingDetected") {
			navigate($(this).attr("data-tab"), phishingWarningPage);
		}
	});

	w.on("contextmenu", webviewMenu.show);

	w.on("crashed", function (e) {
		var tabId = $(this).attr("data-tab");

		destroyWebview(tabId);
		tabs.update(tabId, {
			url: crashedWebviewPage
		});

		addWebview(tabId);
		switchToWebview(tabId);
	});

	w.on("did-fail-load", function (e) {
		if (e.originalEvent.errorCode != -3 && e.originalEvent.validatedURL == e.target.getURL()) {
			navigate($(this).attr("data-tab"), errorPage + "?ec=" + encodeURIComponent(e.originalEvent.errorCode) + "&url=" + e.target.getUrl());
		}
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
	webview.addClass("hidden");

	webviewBase.append(webview);
}

function switchToWebview(id, options) {
	$("webview").hide();

	var webview = getWebview(id);
	webview.removeClass("hidden").show(); //in some cases, webviews had the hidden class instead of display:none to make them load in the background. We need to make sure to remove that.

	if (options && options.focus) {
		webview[0].focus();
	}
}

function updateWebview(id, url) {
	var w = $("webview[data-tab={id}]".replace("{id}", id));

	w.attr("src", urlParser.parse(url));
}

function destroyWebview(id) {
	$("webview[data-tab={id}]".replace("{id}", id)).remove();
}

function getWebview(id) {
	return $("webview[data-tab={id}]".replace("{id}", id));
}
