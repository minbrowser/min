var BANG_REGEX = /!\w+/g;
var serarea = $("#searchbar .search-engine-results");
var iaarea = $("#searchbar .instant-answer-results");
var topAnswerarea = $("#searchbar .top-answer-results");
var suggestedsitearea = $("#searchbar .ddg-site-results");

const minSearchSuggestions = 2;
const maxSearchSuggestions = 4;
var currentSuggestionLimit = maxSearchSuggestions;

/* custom answer layouts */

var IAFormats = {
	color_code: function (searchText, answer) {
		var alternateFormats = [answer.data.rgb, answer.data.hslc, answer.data.cmyb];

		if (searchText.indexOf("#") == -1) { //if the search is not a hex code, show the hex code as an alternate format
			alternateFormats.unshift(answer.data.hexc);
		}

		var item = $("<div class='result-item indent' tabindex='-1'>");
		$("<span class='title'>").text(searchText).appendTo(item);

		$("<div class='result-icon color-circle'>").css("background-color", "#" + answer.data.hex_code).prependTo(item);

		$("<span class='description-block'>").text(alternateFormats.join(" " + METADATA_SEPARATOR + " ")).appendTo(item);

		return item;
	},
	minecraft: function (searchText, answer) {

		var item = $("<div class='result-item indent' tabindex='-1'>");

		$("<span class='title'>").text(answer.data.title).appendTo(item);
		$("<img class='result-icon image'>").attr("src", answer.data.image).prependTo(item);
		$("<span class='description-block'>").text(answer.data.description + " " + answer.data.subtitle).appendTo(item);

		return item;
	},
	figlet: function (searchText, answer) {
		var formattedAnswer = removeTags(answer).replace("Font: standard", "");

		var item = $("<div class='result-item indent' tabindex='-1'>");
		var desc = $("<span class='description-block'>").text(formattedAnswer).appendTo(item);

		//display the data correctly
		desc.css({
			"white-space": "pre-wrap",
			"font-family": "monospace",
			"max-height": "10em",
			"-webkit-user-select": "auto",
		});

		return item;

	},
}

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
							input.val(result.phrase + " ").get(0).focus();
						}, 100);
					});

					$("<span class='secondary-text'>").text(result.phrase).appendTo(item);

					$("<img class='result-icon inline'>").attr("src", result.image).prependTo(item);

					item.appendTo(serarea);
				});

			} else if (results) {
				results = results.splice(0, currentSuggestionLimit);

				results.forEach(function (result) {
					var title = result.phrase;
					if (BANG_REGEX.test(result.phrase) && bangACSnippet) {
						title = result.phrase.replace(BANG_REGEX, "");
						var secondaryText = "Search on " + bangACSnippet;
					}
					var item = $("<div class='result-item iadata-onfocus' tabindex='-1'>").append($("<span class='title'>").text(title)).on("click", function (e) {
						openURLFromsearchbar(e, result.phrase);
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

/* this is called from historySuggestions. When we find history results, we want to limit search suggestions to 2 so the searchbar doesn't get too large. */

var limitSearchSuggestions = function (itemsToRemove) {
	var itemsLeft = Math.max(minSearchSuggestions, maxSearchSuggestions - itemsToRemove);
	currentSuggestionLimit = itemsLeft;
	serarea.find(".result-item:nth-child(n+{items})".replace("{items}", itemsLeft + 1)).remove();
}

window.showInstantAnswers = debounce(function (text, input, options) {

	if (!text) {
		iaarea.empty();
		suggestedsitearea.empty();
		return;
	}

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

	if (text.length > 3) {

		$.getJSON("https://api.duckduckgo.com/?skip_disambig=1&format=json&q=" + encodeURIComponent(text), function (res) {

			//if value has changed, don't show results
			if (text != getValue(input) && !options.alwaysShow) {
				return;
			}

			iaarea.find(".result-item").addClass("old");
			suggestedsitearea.find(".result-item").addClass("old");

			//if there is a custom format for the answer, use that
			if (IAFormats[res.AnswerType]) {
				item = IAFormats[res.AnswerType](text, res.Answer);
			} else {

				if (res.Abstract || res.Answer) {
					var item = $("<div class='result-item indent' tabindex='-1'>");

					if (res.Answer) {
						item.text(removeTags(res.Answer));
					} else {
						item.text(res.Heading);
					}

					if (res.Image && !res.ImageIsLogo) {
						$("<img class='result-icon image low-priority-image'>").attr("src", res.Image).prependTo(item);
					}

					$("<span class='description-block'>").text(removeTags(res.Abstract) || "Answer").appendTo(item);

				}
			}


			item.on("click", function (e) {
				openURLFromsearchbar(e, res.AbstractURL || text);
			});

			//answers are more relevant, they should be displayed at the top
			if (res.Answer) {
				topAnswerarea.empty();
				item.appendTo(topAnswerarea);
			} else {
				item.appendTo(iaarea);
			}


			//suggested site links


			if (res.Results && res.Results[0] && res.Results[0].FirstURL) {

				var itemsWithSameURL = historyarea.find('.result-item[data-url="{url}"]'.replace("{url}", res.Results[0].FirstURL));

				if (itemsWithSameURL.length == 0) {

					var url = urlParser.removeProtocol(res.Results[0].FirstURL).replace(trailingSlashRegex, "");

					var item = $("<div class='result-item' tabindex='-1'>").append($("<span class='title'>").text(url)).on("click", function (e) {

						openURLFromsearchbar(e, res.Results[0].FirstURL);
					});

					$("<i class='fa fa-globe'>").prependTo(item);

					$("<span class='secondary-text'>").text("Suggested site").appendTo(item);

					item.appendTo(suggestedsitearea);
				}
			}

			//if we're showing a location, show a "view on openstreetmap" link

			var entitiesWithLocations = ["location", "country", "u.s. state", "protected area"]

			if (entitiesWithLocations.indexOf(res.Entity) != -1) {
				var item = $("<div class='result-item' tabindex='-1'>");

				$("<i class='fa fa-search'>").appendTo(item);
				$("<span class='title'>").text(res.Heading).appendTo(item);
				$("<span class='secondary-text'>Search on OpenStreetMap</span>").appendTo(item);

				item.on("click", function (e) {
					openURLFromsearchbar(e, "https://www.openstreetmap.org/search?query=" + encodeURIComponent(res.Heading));
				});

				item.prependTo(iaarea);
			}

			if (options.destroyPrevious != false || item) {
				iaarea.find(".old").remove();
				suggestedsitearea.find(".old").remove();
			}


		});
	} else {
		iaarea.find(".old").remove(); //we still want to remove old items, even if we didn't make a new request
		suggestedsitearea.find(".old").remove();
	}

}, 450);
