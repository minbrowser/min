/* zooms the page in an out, and resets */

var _browserZoomLevel = 0
var _browserMaxZoom = 9
var _browserMinZoom = -8

function zoomIn () {
  if (!webFrame) {
    webFrame = electron.webFrame
  }

  if (_browserMaxZoom > _browserZoomLevel) {
    _browserZoomLevel += 1
  }
  webFrame.setZoomLevel(_browserZoomLevel)
}

function zoomOut () {
  if (!webFrame) {
    webFrame = electron.webFrame
  }

  if (_browserMinZoom < _browserZoomLevel) {
    _browserZoomLevel -= 1
  }
  webFrame.setZoomLevel(_browserZoomLevel)
}

function zoomReset () {
  if (!webFrame) {
    webFrame = electron.webFrame
  }

  _browserZoomLevel = 0
  webFrame.setZoomLevel(_browserZoomLevel)
}

ipc.on('zoomIn', zoomIn)
ipc.on('zoomOut', zoomOut)
ipc.on('zoomReset', zoomReset)
