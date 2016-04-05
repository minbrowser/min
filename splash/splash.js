/* check if Min is available for the user's computer */

var failMessage = "Min is not available on this OS";

var availablePlatforms = ["MacIntel"];

var downloadButtons = document.getElementsByClassName("download-button");

var platform = navigator.platform;

var platformMatched = false;

for (var i = 0; i < availablePlatforms.length; i++) {
	if (platform == availablePlatforms[i]) {
		platformMatched = true;
		break;
	}
}

if (!platformMatched) {
	for (var i = 0; i < downloadButtons.length; i++) {
		downloadButtons[i].classList.add("disabled");
		downloadButtons[i].getElementsByClassName("button-label")[0].textContent = failMessage;
	}
} else {
	for (var i = 0; i < downloadButtons.length; i++) {
		downloadButtons[i].addEventListener("click", function () {
			setTimeout(openDownloadPopup, 500);
		}, false);
	}
}

var backdrop = document.getElementsByClassName("backdrop")[0];
var dialog = document.getElementsByClassName("dialog")[0];

var dialogCloseButtons = document.getElementsByClassName("dialog-close-button");

function openDownloadPopup() {
	backdrop.hidden = false;
	dialog.hidden = false;
}

function closeDownloadPopup() {
	backdrop.hidden = true;
	dialog.hidden = true;
}

for (var i = 0; i < dialogCloseButtons.length; i++) {
	dialogCloseButtons[i].addEventListener("click", function (e) {
		closeDownloadPopup();
	}, false);
}

backdrop.addEventListener("click", function () {
	closeDownloadPopup();
}, false);
