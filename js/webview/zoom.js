/* zooms the page in an out, and resets */

window._browser_zoomLevel = 0;
window._browser_maxZoom = 9;
window._browser_minZoom = -8;

ipc.on("zoomIn", function () {
	if (_browser_maxZoom > _browser_zoomLevel) {
		_browser_zoomLevel += 1;
	}
	webFrame.setZoomLevel(_browser_zoomLevel);
});


ipc.on("zoomOut", function () {
	if (_browser_minZoom < _browser_zoomLevel) {
		_browser_zoomLevel -= 1;
	}
	webFrame.setZoomLevel(_browser_zoomLevel);
});


ipc.on("zoomReset", function () {
	_browser_zoomLevel = 0;
	webFrame.setZoomLevel(_browser_zoomLevel);
});

/* back/forward swipe - needs to be fast (no ipc), so in here */

var totalMouseMove = 0;
window.documentUnloaded = false
