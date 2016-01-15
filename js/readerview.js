var readerView = {
	readerURL: "file://" + __dirname + "/reader/index.html",
	getButton: function (tabId) {
		//TODO better icon
		var item = $("<i class='fa fa-align-left reader-button'>").attr("data-tab", tabId).attr("title", "Enter reader view");

		item.on("click", function (e) {
			var tabId = $(this).parents(".tab-item").attr("data-tab");
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
		var button = $('.reader-button[data-tab="{id}"]'.replace("{id}", tabId));
		var tab = tabs.get(tabId);

		if (tab.isReaderView) {
			button.addClass("is-reader").attr("title", "Exit reader view");
			return;
		} else {
			button.removeClass("is-reader").attr("title", "Enter reader view");
		}

		if (tab.readerable) {
			button.addClass("can-reader");
		} else {
			button.removeClass("can-reader");
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
		})
	}
}

//update the reader button on page load

bindWebviewEvent("did-finish-load", function (e) {
	var tab = $(this).attr("data-tab"),
		url = $(this).attr("src");

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
