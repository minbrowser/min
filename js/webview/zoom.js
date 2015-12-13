/* zooms the page in an out, and resets */

var _browser_zoomLevel = 0;
var _browser_maxZoom = 9;
var _browser_minZoom = -8;

function zoomIn() {
	if (!webFrame) {
		webFrame = electron.webFrame;
	}

	if (_browser_maxZoom > _browser_zoomLevel) {
		_browser_zoomLevel += 1;
	}
	webFrame.setZoomLevel(_browser_zoomLevel);
}

function zoomOut() {
	if (!webFrame) {
		webFrame = electron.webFrame;
	}

	if (_browser_minZoom < _browser_zoomLevel) {
		_browser_zoomLevel -= 1;
	}
	webFrame.setZoomLevel(_browser_zoomLevel);
}

function zoomReset() {
	if (!webFrame) {
		webFrame = electron.webFrame;
	}

	_browser_zoomLevel = 0;
	webFrame.setZoomLevel(_browser_zoomLevel);
}

ipc.on("zoomIn", zoomIn);
ipc.on("zoomOut", zoomOut);
ipc.on("zoomReset", zoomReset);
