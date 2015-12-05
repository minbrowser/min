/* detects back/forward swipes */

var totalMouseMove = 0;
var documentUnloaded = false

window.addEventListener("mousewheel", function (e) {
	if (e.deltaY > 10 || e.deltaY < -10) {
		return;
	}

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
}, 4000)
