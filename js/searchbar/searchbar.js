var searchbarCachedText = "";
var METADATA_SEPARATOR = "·";
var didFireKeydownSelChange = false;
var currentsearchbarInput;

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
descriptionBlock: string - the text in the description block
	
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

	return item;
}

var searchbar = document.getElementById("searchbar");
var $searchbar = $(searchbar);

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
	searchbarCachedText = triggerInput.val();
	$(document.body).addClass("searchbar-shown");

	clearsearchbar();

	searchbar.hidden = false;

	currentsearchbarInput = triggerInput.get(0);

}

//gets the typed text in an input, ignoring highlighted suggestions

function getValue(input) {
	var text = input.value;
	return text.replace(text.substring(input.selectionStart, input.selectionEnd), "");
}

function hidesearchbar() {
	currentsearchbarInput = null;
	$(document.body).removeClass("searchbar-shown");
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
	var allItems = $("#searchbar .result-item:not(.unfocusable)");
	var currentItem = $("#searchbar .result-item:focus, .result-item.fakefocus");
	var index = allItems.index(currentItem);
	var logicalNextItem = allItems.eq((previous) ? index - 1 : index + 1);

	$searchbar.find(".fakefocus").removeClass("fakefocus"); //clear previously focused items

	if (currentItem[0] && logicalNextItem[0]) { //an item is focused and there is another item after it, move onto the next one
		logicalNextItem.get(0).focus();
	} else if (currentItem[0]) { //the last item is focused, focus the searchbar again
		getTabElement(tabs.getSelected()).getInput().get(0).focus();
	} else { // no item is focused.
		$("#searchbar .result-item").first().get(0).focus();
	}

	var focusedItem = $("#searchbar .result-item:focus");

	if (focusedItem.hasClass("iadata-onfocus")) {

		setTimeout(function () {
			if (focusedItem.is(":focus")) {
				var itext = focusedItem.find(".title").text();

				showInstantAnswers(itext, currentsearchbarInput, {
					alwaysShow: true,
					destroyPrevious: false,
				});
			}
		}, 200);
	}
}

//return key on result items should trigger click 
//tab key or arrowdown key should focus next item
//arrowup key should focus previous item

$searchbar.on("keydown", ".result-item", function (e) {
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

$searchbar.on("mousewheel", ".history-results .result-item, .top-answer-results .result-item", function (e) {
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

		var div = createSearchbarItem({
			icon: "fa-search",
			title: item,
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
