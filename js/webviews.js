/* implements selecting webviews, switching between them, and creating new ones. */

var webviewBase = $("#webviews");

function updateURLInternal(webview, url) {
	console.log("setting url to " + url)
	webview.attr("src", url);
}

function getWebviewDom(options) {
	var url = (options || {}).url || "about:blank";

	var w = $("<webview>");
	w.attr("preload", "js/view_unsafe/webview_preload.js")
	w.attr("src", urlParser.parse(url));
	w.attr("data-tab", options.tabId);

	//if the tab is private, we want to partition it. See http://electron.atom.io/docs/v0.34.0/api/web-view-tag/#partition
	//since tab IDs are unique, we can use them as partition names
	if (tabs.get(options.tabId).private == true) {
		w.attr("partition", options.tabId);
	}

	//webview events

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
		var url = e.target.getUrl();

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
		if (url.indexOf(__dirname + "/reader/index.html") == 7) { //"file://" is 7 characters
			tabs.update(tab, {
				isReaderView: true
			})
		} else {
			tabs.update(tab, {
				isReaderView: false
			})
		}

		//assume the new page can't be readered, we'll get another message if it can

		tabs.update(tab, {
			readerable: false,
		});
		readerView.updateButton(tab);

		if (tabs.get(tab).private == false) { //don't save to history if in private mode
			bookmarks.updateHistory(tab);
		}

		rerenderTabElement(tab);

	});

	w.on("did-get-redirect-request", function (e) {
		//console.log(e.originalEvent);
	});


	/* too buggy, disabled for now

	w.on("did-fail-load", function (e) {
		if (e.originalEvent.validatedUrl == this.getUrl()) {
			updateURLInternal($(this), "file:///" + __dirname + "/pages/error/index.html?e=" + JSON.stringify(e.originalEvent) + "&url=" + $(this)[0].getUrl());
		}
	});
		
	*/

	w.on("new-window", function (e) {
		var tab = $(this).attr("data-tab");
		var newTab = tabs.add({
			url: e.originalEvent.url,
			private: tabs.get(tab).private //inherit private status from the current tab
		})
		addTab(newTab, {
			focus: false,
			openInBackground: e.originalEvent.disposition == "background-tab", //possibly open in background based on disposition
		});
	});


	// In embedder page. Send the text content to bookmarks when recieved.
	w.on('ipc-message', function (e) {
		var w = this;
		var tab = $(this).attr("data-tab");

		if (e.originalEvent.channel == "bookmarksData") {
			bookmarks.onDataRecieved(e.originalEvent.args[0]);
		} else if (e.originalEvent.channel == "canReader") {
			tabs.update(tab, {
				readerable: true
			});
			readerView.updateButton(tab);
		} else if (e.originalEvent.channel == "contextData") {
			webviewMenu.loadFromContextData(e.originalEvent.args[0]);
		}
	});

	w.on("contextmenu", webviewMenu.show);

	return w;

}

/* options: openInBackground: should the webview be opened without switching to it? default is false. 
 */

var WebviewsWithHiddenClass = false;

function addWebview(tabId, options) {
	options = options || {}; //fallback if options is undefined

	var tabData = tabs.get(tabId);

	var webview = getWebviewDom({
		tabId: tabId,
		url: tabData.url
	});

	webviewBase.append(webview);

	if (!options.openInBackground) {
		switchToWebview(tabId);
	} else {
		//this is used to hide the webview while still letting it load in the background
		webview.addClass("hidden");
	}
}

function switchToWebview(id) {
	$("webview").hide();
	$("webview[data-tab={id}]".replace("{id}", id)).removeClass("hidden").show(); //in some cases, webviews had the hidden class instead of display:none to make them load in the background. We need to make sure to remove that.
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
