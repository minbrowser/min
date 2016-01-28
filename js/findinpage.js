var findinpage = {
	container: document.getElementById("findinpage-bar"),
	isEnabled: false,
	start: function (options) {
		findinpage.container.hidden = false;
		findinpage.isEnabled = true;
		findinpage.input.focus();
		findinpage.input.select();
	},
	end: function (options) {
		findinpage.container.hidden = true;
		findinpage.isEnabled = false;

		//focus the webview

		if (findinpage.input == document.activeElement) {
			getWebview(tabs.getSelected()).focus();
		}
	},
	toggle: function () {
		if (findinpage.isEnabled) {
			findinpage.end();
		} else {
			findinpage.start();
		}
	},
	escape: function (text) { //removes apostrophes from text so we can safely embed it in a string
		return text.replace(/'/g, "\\'");
	}
}

findinpage.input = findinpage.container.querySelector(".findinpage-input");

findinpage.input.addEventListener("keyup", function (e) {
	//escape key should exit find mode, not continue searching
	if (e.keyCode == 27) {
		findinpage.end();
		return;
	}
	var text = findinpage.escape(this.value);
	var webview = getWebview(tabs.getSelected());

	//this stays on the current text if it still matches, preventing flickering. However, if the return key was pressed, we should move on to the next match instead, so this shouldn't run.
	if (e.keyCode != 13) {
		webview.executeJavaScript("window.getSelection().empty()");
	}

	webview.executeJavaScript("find('{t}', false, false, true, false, false, false)".replace("{t}", text)); //see https://developer.mozilla.org/en-US/docs/Web/API/Window/find for a description of the parameters
});

findinpage.input.addEventListener("blur", function (e) {
	findinpage.end();
});
