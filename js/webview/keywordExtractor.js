function isScrolledIntoView(el) { //http://stackoverflow.com/a/22480938/4603285
	var elemTop = el.getBoundingClientRect().top;
	var elemBottom = el.getBoundingClientRect().bottom;

	var isVisible = elemTop < window.innerHeight && elemBottom >= 0
	return isVisible;
}

ipc.on("getKeywordsData", function (e) {

	function extractPageText() {
		var ignore = ["LINK", "STYLE", "SCRIPT", "NOSCRIPT", "svg", "symbol", "title", "path", "style"];
		var text = "";
		var pageElements = document.querySelectorAll("p, h2, h3, h4, [name=author], [itemprop=name], .article-author");
		for (var i = 0; i < pageElements.length; i++) {

			if (!isScrolledIntoView(pageElements[i]) || pageElements[i].style.display == "none" || (pageElements[i].tagName == "META" && window.scrollY > 500)) {
				continue;
			}

			var el = pageElements[i];

			if (ignore.indexOf(el.tagName) == -1) {

				var elText = el.textContent || el.content

				if (/\.\s*$/g.test(elText)) {
					text += " " + elText
				} else {
					text += ". " + elText
				}

			}
		}

		text = text.replace(/[\n\t]/g, ""); //remove useless newlines/tabs that increase filesize

		return text;
	}

	if (getReaderScore() < 400) {
		return;
	}

	//var Knwl = require("knwl.js");

	var text = extractPageText();

	/*var knwlInst = new Knwl("english");

	knwlInst.init(text);

	var places = knwlInst.get("places");
	var links = knwlInst.get("links");
	
	*/

	var nlp = require("nlp_compromise");

	var items = nlp.spot(text, {});

	var entities = [];

	items.forEach(function (item) {
		if (item.pos_reason.indexOf("noun_capitalised") == -1) {
			return;
		}

		entities.push(item.text.replace(/[^a-zA-Z\s]/g, ""));
	});

	ipc.sendToHost("keywordsData", {
		entities: entities,
	});

});
