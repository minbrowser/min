/* check if Min is available for the user's computer */

var failMessage = "Min requires OS X or Ubuntu";

var availablePlatforms = ["MacIntel"];

var platforms = {
	"MacIntel": "https://github.com/PalmerAL/min/releases/download/v1.2.1/Min-v1.2.1-darwin-x64.zip",
	"Linux i686": "https://github.com/PalmerAL/min/releases/download/v1.2.1/Min_1.2.1_i386.deb",
	"x86_64": "https://github.com/PalmerAL/min/releases/download/v1.2.1/Min_1.2.1_amd64.deb",
}

var downloadButtons = document.getElementsByClassName("download-button");
var subtexts = document.getElementsByClassName("button-subtext");

//convert from a collection to an array, so the list doesn't change as we remove elements

var subtextArray = [];

for (var i = 0; i < subtexts.length; i++) {
	subtextArray.push(subtexts[i]);
}

var nav = navigator.platform;

var platformMatched = false;
var downloadLink = null;

for (var platform in platforms) {
	if (nav.indexOf(platform) !== -1) {
		platformMatched = true;
		downloadLink = platforms[platform];
		break;
	}
}

//android often reports linux as the platform

if (navigator.userAgent.indexOf("Android") !== -1) {
	platformMatched = false;
}

if (platformMatched) {
	for (var i = 0; i < downloadButtons.length; i++) {
		downloadButtons[i].parentElement.href = downloadLink;

		//show gatekeeper instruction popup
		if (nav === "MacIntel") {
			downloadButtons[i].addEventListener("click", function () {
				setTimeout(openDownloadPopup, 500);
			}, false);
		}
	}
} else {
	for (var i = 0; i < downloadButtons.length; i++) {
		downloadButtons[i].classList.add("disabled");
		downloadButtons[i].getElementsByClassName("button-label")[0].textContent = failMessage;
	}
	for (var i = 0; i < subtexts.length; i++) {
		subtexts[i].textContent = "Download anyway >>";
	}
}

if (platformMatched && nav != "MacIntel") {

	for (var i = 0; i < subtextArray.length; i++) {
		subtextArray[i].parentNode.removeChild(subtextArray[i]);
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
