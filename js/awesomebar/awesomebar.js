var awesomebarShown = false;
var awesomebarCachedText = "";
var cachedACItem = "";
var autocompleteEnabled = true;
var shouldContinueAC = true;
var METADATA_SEPARATOR = "·";
var didFireKeydownSelChange = false;
var currentAwesomebarInput;

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

function removeTags(text) {
	return text.replace(/<[\w\W]*>/g, "");
}

function unsafeUnwrapTags(text) {
	return $("<div>").html(text).text();
}

/* this is used by navbar-tabs.js. When a url is entered, endings such as ? need to be parsed and removed. */
function parseAwesomebarURL(url) {
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

function openURLInBackground(url) { //used to open a url in the background, without leaving the awesomebar
	var newTab = tabs.add({
		url: url,
		private: tabs.get(tabs.getSelected()).private
	})
	addTab(newTab, {
		focus: false,
		openInBackground: true,
		leaveEditMode: false,
	});
	$(".result-item:focus").blur(); //remove the highlight from an awesoembar result item, if there is one
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

var awesomebar = $("#awesomebar");
var historyarea = awesomebar.find(".history-results");
var bookmarkarea = awesomebar.find(".bookmark-results");
var topicsarea = awesomebar.find(".topic-results");
var opentabarea = awesomebar.find(".opentab-results");

function clearAwesomebar() {
	opentabarea.html("");
	topAnswerarea.html("");
	bookmarkarea.html("");
	historyarea.html("");
	topicsarea.html("");
	iaarea.html("");
	suggestedsitearea.html("");
	serarea.html("");
}

function showAwesomebar(triggerInput) {
	awesomebarCachedText = triggerInput.val();
	awesomebarShown = true;
	$(document.body).addClass("awesomebar-shown");

	clearAwesomebar();


	awesomebar.show();

	currentAwesomebarInput = triggerInput;

}

//gets the typed text in an input, ignoring highlighted suggestions

function getValue(input) {
	var text = input.val();
	return text.replace(text.substring(input[0].selectionStart, input[0].selectionEnd), "");
}

function hideAwesomebar() {
	awesomebarShown = false;
	$(document.body).removeClass("awesomebar-shown");
	awesomebar.hide();
	cachedBangSnippets = {};
}
var showAwesomebarResults = throttle(function (text, input, event) {

	isExpandedHistoryMode = false;

	//find the real input value, accounting for highlighted suggestions and the key that was just pressed

	var v = input[0].value;

	//delete key doesn't behave like the others, String.fromCharCode returns an unprintable character (which has a length of one)

	if (event.keyCode != 8) {

		text = v.substring(0, input[0].selectionStart) + String.fromCharCode(event.keyCode) + v.substring(input[0].selectionEnd + 1, v.length).trim();

	} else {
		txt = v;
	}


	hasAutocompleted = false;

	shouldContinueAC = !(event.keyCode == 8); //this needs to be outside searchHistory so that it doesn't get reset if the history callback is run multiple times (such as when multiple messages get sent before the worker has finished startup).

	console.log("awesomebar: ", "'" + text + "'", text.length);

	//there is no text, show a blank awesomebar
	if (text.length < 1) {
		clearAwesomebar();
		return;
	}

	//when you start with ?, always search with duckduckgo

	if (text.indexOf("?") == 0) {
		clearAwesomebar();

		maxSearchSuggestions = 5;
		showSearchSuggestions(text.replace("?", ""), input);
		return;
	}

	//when you start with ^, always search history (only)

	if (text.indexOf("^") == 0) {
		clearAwesomebar();
		showHistoryResults(text.replace("^", ""), input);
		return;
	}

	//when you start with *, always search bookmarks (only)

	if (text.indexOf("*") == 0) {
		clearAwesomebar();
		showBookmarkResults(text.replace("*", ""), input);
		return;
	}

	//show awesomebar results


	//normally, we will search history first, and only show search suggestions if there aren't any history results. However, if the history db isn't opened yet (which it won't be if the page loaded less than a few seconds ago), we should show results without waiting for history. Also, show results if a !bang search is occuring
	if (performance.now() < 12500 || text.indexOf("!") == 0) {

		showSearchSuggestions(text, input);
	}

	showBookmarkResults(text);

	showHistoryResults(text, input);
	showInstantAnswers(text, input);
	showTopicResults(text, input);
	searchOpenTabs(text, input);

	//update cache
	awesomebarCachedText = text;
}, 25);

function focusAwesomebarItem(options) {
	options = options || {}; //fallback if options is null
	var previous = options.focusPrevious;
	var allItems = $("#awesomebar .result-item:not(.unfocusable)");
	var currentItem = $("#awesomebar .result-item:focus");
	var index = allItems.index(currentItem);
	var logicalNextItem = allItems.eq((previous) ? index - 1 : index + 1);


	if (currentItem[0] && logicalNextItem[0]) { //an item is focused and there is another item after it, move onto the next one
		logicalNextItem.get(0).focus();
	} else { // the last item is focused, or no item is focused. Focus the first one again.
		$("#awesomebar .result-item").first().get(0).focus();
	}
}

//return key on result items should trigger click 
//tab key or arrowdown key should focus next item
//arrowup key should focus previous item

awesomebar.on("keydown", ".result-item", function (e) {
	if (e.keyCode == 13) {
		$(this).trigger("click");
	} else if (e.keyCode == 9 || e.keyCode == 40) { //tab or arrowdown key
		e.preventDefault();
		focusAwesomebarItem();
	} else if (e.keyCode == 38) {
		e.preventDefault();
		focusAwesomebarItem({
			focusPrevious: true
		});
	}
});

//when we get keywords data from the page, we show those results in the awesomebar

bindWebviewIPC("keywordsData", function (webview, tabId, arguements) {

	var data = arguements[0];

	var hasShownDDGpopup = false;
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

		if (!hasShownDDGpopup) {
			showInstantAnswers(data.entities[0], currentAwesomebarInput, {
				alwaysShow: true
			});

			hasShownDDGpopup = true;
		}

		var div = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(item)).on("click", function (e) {
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
