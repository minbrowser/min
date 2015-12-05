/* zooms the page in an out, and resets */

var _browser_zoomLevel = 0;
var _browser_maxZoom = 9;
var _browser_minZoom = -8;

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
