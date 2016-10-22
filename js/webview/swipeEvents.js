/* detects back/forward swipes */

var totalMouseMove = 0
var verticalMouseMove = 0
var eventsCaptured = 0
var documentUnloaded = false

window.addEventListener('mousewheel', function (e) {
  verticalMouseMove += e.deltaY
  eventsCaptured++
  /* default zoom modifier is ctrl. Mac uses cmd/meta/super so an exeption will be made below */
  var platformZoomKey = e.ctrlKey

  /* if platform is Mac Enable pinch zoom
  	the browser engine detects piches as ctrl+mousewheel on mac,
  	therefore it should not affect other platforms that user ctrl+mousewheel to zoom.
  */
  if (navigator.platform === 'MacIntel') {
    if (e.ctrlKey && !e.defaultPrevented) {
      if (verticalMouseMove > 10) {
        return zoomOut()
      }
      if (verticalMouseMove < -10) {
        return zoomIn()
      }
    }
    platformZoomKey = e.metaKey
  }
  /* cmd-key while scrolling should zoom in and out */

  if (verticalMouseMove > 55 && platformZoomKey && eventsCaptured > 1) {
    verticalMouseMove = -10
    return zoomOut()
  }

  if (verticalMouseMove < -55 && platformZoomKey && eventsCaptured > 1) {
    verticalMouseMove = -10
    return zoomIn()
  }
  if (e.deltaY > 5 || e.deltaY < -10) {
    return
  }

  if (!documentUnloaded) {
    totalMouseMove += e.deltaX

    if (totalMouseMove < -150) {
      doneNavigating = true
      window.history.back()
      documentUnloaded = true
      setTimeout(function () {
        documentUnloaded = false
      }, 3000)
    } else if (totalMouseMove > 100) {
      documentUnloaded = true
      window.history.go(1)
      setTimeout(function () {
        documentUnloaded = false
      }, 3000)
    }
  }
})

setInterval(function () {
  totalMouseMove = 0
}, 4000)

setInterval(function () {
  verticalMouseMove = 0
  eventsCaptured = 0
}, 1000)
