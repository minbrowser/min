var showTopicResults = function (text, input) {

	bookmarks.searchTopics(text, function (topics) {

		topicsarea.html("");

		if (!topics || !topics[0]) {
			return;
		}

		topics.splice(0, 4).forEach(function (topic) {
			if (topic.name == input.val()) {
				return;
			}
			$("<div class='result-item tag' tabindex='-1'>").text(topic.name).appendTo(topicsarea).on("click", function (e) {

				//enter a special history-only mode

				clearAwesomebar();

				input.val(topic.name);

				showHistoryResults(topic.name, input, 50); //show up to 50 results.

				setTimeout(function () {
					input.focus();
				}, 800);
			});
		});


	});

}
