/* detects back/forward swipes */

var totalMouseMove = 0;
var verticalMouseMove = 0;
var documentUnloaded = false

window.addEventListener("mousewheel", function (e) {

	console.log(e);

	verticalMouseMove += e.deltaY;

	/* cmd-key while scrolling should zoom in and out */

	if (verticalMouseMove > 40 && e.metaKey) {
		verticalMouseMove = 0;
		return zoomOut();
	}

	if (verticalMouseMove < -40 && e.metaKey) {
		verticalMouseMove = 0;
		return zoomIn();
	}
	if (e.deltaY > 5 || e.deltaY < -10) {
		return;
	}

	console.log(e);

	if (!documentUnloaded) {

		totalMouseMove += e.deltaX


		if (totalMouseMove < -150) {
			doneNavigating = true;
			window.history.back();
			documentUnloaded = true;
			console.log("going back");
			setTimeout(function () {
				documentUnloaded = false;
			}, 3000);
		} else if (totalMouseMove > 100) {
			console.log("going forward");
			documentUnloaded = true;
			window.history.go(1);
			console.log(e);
			setTimeout(function () {
				documentUnloaded = false;
			}, 3000);
		}

	}
});

setInterval(function () {
	totalMouseMove = 0;
}, 4000);

setInterval(function () {
	verticalMouseMove = 0;
}, 1000);
