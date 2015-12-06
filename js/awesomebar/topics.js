const maxTopicResults = 2;
const showTopicResults = function (text, input) {

	bookmarks.searchTopics(text, function (topics) {

		topicsarea.html("");

		if (!topics || !topics[0]) {
			return;
		}

		var topicsShown = 0;

		topics.forEach(function (topic) {
			if (topicsShown < maxTopicResults) {
				if (topic.name == text) {
					return;
				}
				$("<div class='result-item' tabindex='-1'>").text(topic.name).attr("title", "More results for this topic").prepend("<i class='fa fa-tag'></i>").appendTo(topicsarea).on("click", function (e) {

					//enter a special history-only mode

					isExpandedHistoryMode = true;

					clearAwesomebar();

					input.val(topic.name);

					showHistoryResults(topic.name, input, 50); //show up to 50 results.
					showBookmarkResults(topic.name);

					setTimeout(function () { //the item was focused on the keydown event. If we immediately focus the input, a keypress event will occur, causing an exit from edit mode
						input.focus();
					}, 100);
				});
				topicsShown++;
			}
		});


	});

}
