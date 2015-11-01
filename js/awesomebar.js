var awesomebarShown = false;
var awesomebarCachedText = "";
var cachedACItem = "";
var autocompleteEnabled = true;

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


var awesomebar = $("#awesomebar");
var historyarea = $(".history-results");
var bookmarkarea = $(".bookmark-results");
var serarea = $(".search-engine-results");
var iaarea = $(".instant-answer-results");

function showAwesomebar(triggerInput) {
	awesomebarCachedText = triggerInput.val();
	awesomebarShown = true;
	$(document.body).addClass("awesomebar-shown");
	//clear any previous results
	historyarea.html("");
	bookmarkarea.html("");
	serarea.html("");
	iaarea.html("");


	awesomebar.show();

	var currentTab = tabs.get(tabs.getSelected());

}

function hideAwesomebar() {
	awesomebarShown = false;
	$(document.body).removeClass("awesomebar-shown");
	awesomebar.hide();
	cachedBangSnippets = {};
}

var BANG_REGEX = /!\w+/g;

window.showDuckduckgoABData = throttle(function (text, input) {

	if (BANG_REGEX.test(text)) { //we're typing a bang
		var bang = text.match(BANG_REGEX)[0];

		var bangACSnippet = cachedBangSnippets[bang];

	}
	$.ajax("https://ac.duckduckgo.com/ac/?q=" + encodeURIComponent(text))
		.done(function (results) {

			serarea.find(".result-item").addClass("old");

			if (results && results[0] && results[0].snippet) { //!bang search - ddg api doesn't have a good way to detect this

				results.splice(0, 5).forEach(function (result) {
					cachedBangSnippets[result.phrase] = result.snippet;

					//autocomplete the bang, but allow the user to keep typing

					var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(result.snippet)).on("click", function () {
						setTimeout(function () { //if the click was triggered by the keydown, focusing the input and then keyup will cause a navigation. Wait a bit for keyup before focusing the input again.
							input.val(result.phrase + " ").focus();
						}, 100);
					});

					$("<span class='secondary-text'>").text(result.phrase).appendTo(item);

					$("<img class='result-icon inline'>").attr("src", result.image).prependTo(item);

					item.appendTo(serarea);
				});

			} else if (results) {
				results = results.splice(0, 5);

				results.forEach(function (result) {
					var title = result.phrase;
					if (BANG_REGEX.test(result.phrase) && bangACSnippet) {
						title = result.phrase.replace(BANG_REGEX, "");
						var secondaryText = "Search on " + bangACSnippet;
					}
					var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(title)).on("click", function () {
						navigate(tabs.getSelected(), result.phrase);
					});

					item.appendTo(serarea);

					if (urlParser.isUrl(result.phrase) || urlParser.isUrlMissingProtocol(result.phrase)) { //website suggestions
						$("<i class='fa fa-globe'>").prependTo(item);
					} else { //regular search results
						$("<i class='fa fa-search'>").prependTo(item);
					}

					if (secondaryText) {
						$("<span class='secondary-text'>").text(secondaryText).appendTo(item);
					}
				});
			}

			serarea.find(".old").remove();
		});

	//instant answers

	iaarea.find(".result-item").addClass("old");

	if (text.length > 3) {

		$.getJSON("https://api.duckduckgo.com/?skip_disambig=1&format=json&pretty=1&q=" + encodeURIComponent(text), function (res) {

			iaarea.find(".result-item").addClass("old");

			if (res.Abstract || res.Answer) {
				var item = $("<div class='result-item' tabindex='-1'>");
				item.text(res.Heading || unsafeUnwrapTags(res.Answer));

				if (res.Image) {
					$("<img class='result-icon image'>").attr("src", res.Image).prependTo(item);
				}

				$("<span class='description-block'>").text(removeTags(res.Abstract) || "Answer").appendTo(item);

				item.on("click", function () {
					navigate(tabs.getSelected(), res.AbstractURL || text)
				});
				item.appendTo(iaarea);
			}

			iaarea.find(".old").remove();

		});
	} else {
		iaarea.find(".old").remove(); //we still want to remove old items, even if we didn't make a new request
	}

}, 800);

var METADATA_SEPARATOR = "·";

var showBookmarkResults = throttle(function (text) {
	bookmarks.search(text, function (results) {
		bookmarkarea.html("");
		results.splice(0, 2).forEach(function (result) {
			if (result.score > 0.001) {

				//create the basic item
				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(result.title)).on("click", function () {
					navigate(tabs.getSelected(), result.url);
				});

				$("<i class='fa fa-star'>").prependTo(item);

				var span = $("<span class='secondary-text'>").text(urlParser.removeProtocol(result.url));


				if (result.extraData && result.extraData.metadata) {
					var captionSpans = [];

					if (result.extraData.metadata.rating) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.rating));
					}
					if (result.extraData.metadata.price) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.price));
					}
					if (result.extraData.metadata.location) {
						captionSpans.push($("<span class='md-info'>").text(result.extraData.metadata.location));
					}


					captionSpans.reverse().forEach(function (s) {
						span.prepend(s);
					})
				}


				span.appendTo(item);

				item.appendTo(bookmarkarea);
			}

		});
	});
}, 400);

var showAwesomebarResults = throttle(function (text, input, keyCode) {

	var shouldContinueAC = !(keyCode == 8); //this needs to be outside searchHistory so that it doesn't get reset if the history callback is run multiple times (such as when multiple messages get sent before the worker has finished startup).

	console.log("awesomebar: ", text);

	if (text == awesomebarCachedText) { //if nothing has actually changed, don't re-render
		return;
	}


	//there is no text, show a blank awesomebar
	if (text.length < 1) {
		serarea.html("");
		iaarea.html("");
		return;
	}

	if (text.length > 3) {
		showBookmarkResults(text);
	}

	var input0 = input[0];

	bookmarks.searchHistory(text, function (results) {
		console.log("recieved history data: ", text, results);
		historyarea.html("");

		results.forEach(function (result, index) {

			//if we've started typing the result and didn't press the delete key (which should make the highlight go away), autocomplete in the input

			var text = input.val(); //make sure the input hasn't changed between start and end of query

			var textWithoutProtocol = urlParser.removeProtocol(text),
				UrlWithoutProtocol = urlParser.removeProtocol(result.url);

			if (textWithoutProtocol != text) {
				var hasProtocol = true;
			}
			var hasWWW = text.indexOf("www.") != -1

			if (textWithoutProtocol.indexOf("/") == -1) {
				var hasPath = false;
			} else {
				var hasPath = true;
			}
			if (shouldContinueAC && cachedACItem.indexOf(text) == 0) {
				input.blur();
				input0.value = cachedACItem;
				input0.setSelectionRange(text.length, cachedACItem.length);
				input.focus();
				awesomebarCachedText = input.val();
				shouldContinueAC = false;
			}
			if (autocompleteEnabled && shouldContinueAC && textWithoutProtocol && UrlWithoutProtocol.indexOf(textWithoutProtocol) == 0) { //the user has started to type the url
				console.log("autocompleting");
				var withWWWset = ((hasWWW) ? result.url : result.url.replace("www.", ""))
				var ac = ((hasProtocol) ? withWWWset : UrlWithoutProtocol);
				if (!hasPath && !urlParser.isSystemURL(withWWWset)) {
					//if there isn't a / character typed yet, we only want to autocomplete to the domain
					var a = document.createElement("a");
					a.href = withWWWset;
					ac = ((hasProtocol) ? a.protocol + "//" : "") + a.hostname;
				}
				if (!ac) { //make sure we have something to autocomplete - this could not exist if we are using domain autocomplete and the ac string didn't have a hostname when processed
					return;
				}
				input.blur();
				input0.value = ac;
				input0.setSelectionRange(text.length, ac.length);
				input.focus();
				//update cache
				awesomebarCachedText = input0.value,
					shouldContinueAC = false,
					cachedACItem = ac;
			}

			if (index < 3) { //only show up to three history items

				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(result.title)).on("click", function () {
					navigate(tabs.getSelected(), result.url);
				});

				$("<i class='fa fa-globe'>").prependTo(item);

				$("<span class='secondary-text'>").text(urlParser.removeProtocol(result.url)).appendTo(item);

				item.appendTo(historyarea);
			}

		});
	});


	showDuckduckgoABData(text, input);

	//update cache
	awesomebarCachedText = text;
}, 25);

function focusAwesomebarItem(options) {
	options = options || {}; //fallback if options is null
	var previous = options.focusPrevious;
	var allItems = $("#awesomebar .result-item");
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
