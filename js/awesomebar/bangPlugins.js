var bangPlugins = {};

function showBangPlugins(text, input) {
	for (var key in bangPlugins) {
		bangPlugins[key](text, input);
	}
}

bangPlugins.wiktionary = function (text, input) {

	if (text.indexOf("!wiktionary") == 0 && !tabs.get(tabs.getSelected()).private) {
		var search = text.replace("!wiktionary", "");

		if (!text) {
			return;
		}

		getDictionaryInfo(search, "English", function (data) {

			topAnswerarea.html(""); //clear previous answers

			if (!data || !data.definitions || !data.definitions[0] || !data.definitions[0].meaning || text != input.val()) {
				return;
			}

			var item = $("<div class='result-item' tabindex='-1'>").text(data.title);
			$("<span class='description-block'>").text(data.definitions[0].meaning).appendTo(item);

			item.on("click", function (e) {
				var URL = "https://en.wiktionary.org/wiki/" + data.title;
				if (e.metaKey) {
					openURLInBackground(URL);

				} else {
					navigate(tabs.getSelected(), URL);
				}
			});

			item.appendTo(topAnswerarea);
		});
	}
}
