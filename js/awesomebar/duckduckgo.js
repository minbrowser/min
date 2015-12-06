var BANG_REGEX = /!\w+/g;
var serarea = $("#awesomebar .search-engine-results");
var iaarea = $("#awesomebar .instant-answer-results");
var topAnswerarea = $("#awesomebar .top-answer-results");
var suggestedsitearea = $("#awesomebar .ddg-site-results");

var maxSearchSuggestions = 5;

/* duckduckgo returns raw html for the color info ui. We need to format that */

function unsafe_showColorUI(searchText, colorHTML) {
	var el = $("<div>").html(colorHTML);
	var color = el.find(".colorcodesbox.circle").css("background");
	var alternateFormats = [];

	el.find(".no_vspace").each(function () {
		alternateFormats.push($(this).text());
	});

	var item = $("<div class='result-item' tabindex='-1'>");

	item.text(searchText);

	$("<div class='result-icon color-circle'>").css("background", color).prependTo(item);

	$("<span class='description-block'>").text(alternateFormats.join(" " + METADATA_SEPARATOR + " ")).appendTo(item);

	return item;
};

//this is triggered from history.js - we only show search suggestions if we don't have history results
window.showSearchSuggestions = throttle(function (text, input) {

	if (!text) {
		return;
	}

	//we don't show search suggestions in private tabs, since this would send typed text to DDG

	if (tabs.get(tabs.getSelected()).private) {
		return;
	}

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
				results = results.splice(0, maxSearchSuggestions);

				results.forEach(function (result) {
					var title = result.phrase;
					if (BANG_REGEX.test(result.phrase) && bangACSnippet) {
						title = result.phrase.replace(BANG_REGEX, "");
						var secondaryText = "Search on " + bangACSnippet;
					}
					var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(title)).on("click", function (e) {
						if (e.metaKey) {
							openURLInBackground(result.phrase);
						} else {
							navigate(tabs.getSelected(), result.phrase);
							cachedBangSnippets = [];
						}
					});

					item.appendTo(serarea);

					if (urlParser.isURL(result.phrase) || urlParser.isURLMissingProtocol(result.phrase)) { //website suggestions
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

}, 500);

/* this is called from historySuggestions. When we find history results, we want to limit search suggestions to 2 so the awesomebar doesn't get too large. */

var limitSearchSuggestions = function (itemsToRemove) {
	var itemsLeft = Math.max(2, 5 - itemsToRemove);
	maxSearchSuggestions = itemsLeft;
	serarea.find(".result-item:nth-child(n+{items})".replace("{items}", itemsLeft + 1)).remove();
}

window.showInstantAnswers = throttle(function (text, input, options) {

	options = options || {};

	//don't make useless queries
	if (urlParser.isURLMissingProtocol(text)) {
		return;
	}

	//don't send typed text in private mode
	if (tabs.get(tabs.getSelected()).private) {
		return;
	}

	//instant answers

	iaarea.find(".result-item").addClass("old");
	suggestedsitearea.find(".result-item").addClass("old");
	topAnswerarea.find(".result-item").addClass("old");

	if (text.length > 3) {

		$.getJSON("https://api.duckduckgo.com/?skip_disambig=1&format=json&q=" + encodeURIComponent(text), function (res) {

			//if value has changed, don't show results
			if (text != getValue(input) && !options.alwaysShow) {
				return;
			}

			iaarea.find(".result-item").addClass("old");
			suggestedsitearea.find(".result-item").addClass("old");

			if (res.Abstract || res.Answer) {
				var item = $("<div class='result-item' tabindex='-1'>");

				if (res.Answer) {
					item.text(unsafeUnwrapTags(res.Answer));
				} else {
					item.text(res.Heading);
				}

				/*if (res.Image && res.Entity != "company" && res.Entity != "country" && res.Entity != "website") { //ignore images for entities that generally have useless or ugly images
					$("<img class='result-icon image'>").attr("src", res.Image).prependTo(item);
				}*/

				$("<span class='description-block'>").text(removeTags(res.Abstract) || "Answer").appendTo(item);

				//the parsing for this is different

				if (res.AnswerType == "color_code") {
					item = unsafe_showColorUI(text, res.Answer);
				}

				item.on("click", function (e) {
					if (e.metaKey) {
						openURLInBackground(res.AbstractURL || text);
					} else {
						navigate(tabs.getSelected(), res.AbstractURL || text)
					}
				});

				//answers are more relevant, they should be displayed at the top
				if (res.Answer) {
					item.appendTo(topAnswerarea);
				} else {
					item.appendTo(iaarea);
				}
			}

			//suggested site links

			if (res.Results && res.Results[0] && res.Results[0].FirstURL) {
				var url = urlParser.removeProtocol(res.Results[0].FirstURL).replace(trailingSlashRegex, "");

				var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(url)).on("click", function (e) {

					if (e.metaKey) {
						openURLInBackground(res.Results[0].FirstURL);

					} else {
						navigate(tabs.getSelected(), res.Results[0].FirstURL);
					}
				});

				$("<i class='fa fa-globe'>").prependTo(item);

				$("<span class='secondary-text'>").text("Suggested site").appendTo(item);

				console.log(item);

				//if we have bookmarks for that item, we probably don't need to suggest a site
				if (bookmarkarea.find(".result-item").length < 2) {
					item.appendTo(suggestedsitearea);
				}
			}

			iaarea.find(".old").remove();
			suggestedsitearea.find(".old").remove();
			topAnswerarea.find(".old").remove();


		});
	} else {
		iaarea.find(".old").remove(); //we still want to remove old items, even if we didn't make a new request
		suggestedsitearea.find(".old").remove();
	}

}, 700);
