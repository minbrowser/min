var searchbarShown = false;
var searchbarCachedText = "";
var METADATA_SEPARATOR = "·";
var didFireKeydownSelChange = false;
var currentsearchbarInput;

//cache duckduckgo bangs so we make fewer network requests
var cachedBangSnippets = {};

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

function removeTags(text) {
	return text.replace(/<[\w\W]*>/g, "");
}

function unsafeUnwrapTags(text) {
	return $("<div>").html(text).text();
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
		focus: false,
		openInBackground: true,
		leaveEditMode: false,
	});
	$(".result-item:focus").blur(); //remove the highlight from an awesoembar result item, if there is one
}

//when clicking on a result item, this function should be called to open the URL

function openURLFromsearchbar(event, url) {
	if (event.metaKey) {
		openURLInBackground(url);
		return true;
	} else {
		navigate(tabs.getSelected(), url);
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

			//match website name | title. This is less common, so it has a higher threshold

			if (titleChunks[0].length / titleChunks[1].length < 0.35) {
				return titleChunks[1]
			}
		}
	}

	//fallback to the regular title

	return text;
}

var searchbar = $("#searchbar");
var historyarea = searchbar.find(".history-results");
var bookmarkarea = searchbar.find(".bookmark-results");
var opentabarea = searchbar.find(".opentab-results");

function clearsearchbar() {
	opentabarea.empty();
	topAnswerarea.empty();
	bookmarkarea.empty();
	historyarea.empty();
	iaarea.empty();
	suggestedsitearea.empty();
	serarea.empty();

	//prevent memory leak
	cachedBangSnippets = [];
}

function showSearchbar(triggerInput) {
	searchbarCachedText = triggerInput.val();
	searchbarShown = true;
	$(document.body).addClass("searchbar-shown");

	clearsearchbar();


	searchbar.show();

	currentsearchbarInput = triggerInput;

}

//gets the typed text in an input, ignoring highlighted suggestions

function getValue(input) {
	var text = input.val();
	return text.replace(text.substring(input[0].selectionStart, input[0].selectionEnd), "");
}

function hidesearchbar() {
	searchbarShown = false;
	currentsearchbarInput = null;
	$(document.body).removeClass("searchbar-shown");
	searchbar.hide();
	cachedBangSnippets = {};
}
var showSearchbarResults = function (text, input, event) {

	isExpandedHistoryMode = false;
	deleteKeyPressed = event && event.keyCode == 8;

	//find the real input value, accounting for highlighted suggestions and the key that was just pressed

	var v = input[0].value;

	//delete key doesn't behave like the others, String.fromCharCode returns an unprintable character (which has a length of one)

	if (event && event.keyCode != 8) {

		text = v.substring(0, input[0].selectionStart) + String.fromCharCode(event.keyCode) + v.substring(input[0].selectionEnd + 1, v.length).trim();

	} else {
		txt = v;
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

		maxSearchSuggestions = 5;
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


	//show results if a !bang search is occuring
	if (text.indexOf("!") == 0) {

		showSearchSuggestions(text, input);
	}

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
	var allItems = $("#searchbar .result-item:not(.unfocusable)");
	var currentItem = $("#searchbar .result-item:focus, .result-item.fakefocus");
	var index = allItems.index(currentItem);
	var logicalNextItem = allItems.eq((previous) ? index - 1 : index + 1);

	searchbar.find(".fakefocus").removeClass("fakefocus"); //clear previously focused items

	if (currentItem[0] && logicalNextItem[0]) { //an item is focused and there is another item after it, move onto the next one
		logicalNextItem.get(0).focus();
	} else if (currentItem[0]) { //the last item is focused, focus the searchbar again
		getTabElement(tabs.getSelected()).getInput().get(0).focus();
	} else { // no item is focused.
		$("#searchbar .result-item").first().get(0).focus();
	}

	var focusedItem = $("#searchbar .result-item:focus");

	if (focusedItem.hasClass("iadata-onfocus")) {
		var itext = focusedItem.find(".title").text();

		showInstantAnswers(itext, currentsearchbarInput, {
			alwaysShow: true,
			destroyPrevious: false,
		});
	}
}

//return key on result items should trigger click 
//tab key or arrowdown key should focus next item
//arrowup key should focus previous item

searchbar.on("keydown", ".result-item", function (e) {
	if (e.keyCode == 13) {
		$(this).trigger("click");
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

//swipe left on history items to delete them

var lastItemDeletion = Date.now();

searchbar.on("mousewheel", ".history-results .result-item, .top-answer-results .result-item", function (e) {
	var self = $(this)
	if (e.originalEvent.deltaX > 50 && e.originalEvent.deltaY < 3 && self.attr("data-url") && Date.now() - lastItemDeletion > 700) {
		lastItemDeletion = Date.now();
		self.animate({
			opacity: "0",
			"margin-left": "-100%"
		}, 200, function () {
			self.remove();
			bookmarks.deleteHistory(self.attr("data-url"));
			lastItemDeletion = Date.now();
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

		var div = $("<div class='result-item iadata-onfocus' tabindex='-1'>").append($("<span class='title'>").text(item)).on("click", function (e) {
			if (e.metaKey) {
				openURLInBackground(item);
			} else {
				navigate(tabs.getSelected(), item);
			}
		});

		$("<i class='fa fa-search'>").prependTo(div);

		div.appendTo(serarea);

		itemsCt++;
		itemsShown.push(item.trim());
	});
});
