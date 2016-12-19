var swipeGestureTimeout = -1

var horizontalMouseMove = 0
var verticalMouseMove = 0

var beginningScrollLeft = null
var beginningScrollRight = null

function resetCounters () {
  horizontalMouseMove = 0
  verticalMouseMove = 0

  beginningScrollLeft = null
  beginningScrollRight = null
}

function onSwipeGestureFinish () {

  // swipe to the left to go forward
  if (horizontalMouseMove - beginningScrollRight > 150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5) {
    if (beginningScrollRight < 10 || horizontalMouseMove - beginningScrollRight > 800) {
      resetCounters()
      window.history.go(1)
    }
  }

  // swipe to the right to go backwards
  if (horizontalMouseMove + beginningScrollLeft < -150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5) {
    if (beginningScrollLeft < 10 || horizontalMouseMove + beginningScrollLeft < -800) {
      resetCounters()
      window.history.go(-1)
    }
  }

  resetCounters()
}

window.addEventListener('wheel', function (e) {
  horizontalMouseMove += e.deltaX
  verticalMouseMove += e.deltaY

  if (!beginningScrollLeft || !beginningScrollRight) {
    beginningScrollLeft = document.scrollingElement.scrollLeft
    beginningScrollRight = document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth - document.scrollingElement.scrollLeft
  }

  if (Math.abs(e.deltaX) >= 20 || Math.abs(e.deltaY) >= 20) {
    clearTimeout(swipeGestureTimeout)
    swipeGestureTimeout = setTimeout(onSwipeGestureFinish, 70)
  }

  /* default zoom modifier is ctrl. Mac uses cmd/meta/super so an exeption will be made below */
  var platformZoomKey = e.ctrlKey

  /* if platform is Mac Enable pinch zoom
  	the browser engine detects piches as ctrl+mousewheel on mac,
  	therefore it should not affect other platforms that user ctrl+mousewheel to zoom.
  */
  if (navigator.platform === 'MacIntel') {
    if (e.ctrlKey && !e.defaultPrevented) {
      if (verticalMouseMove > 10) {
        zoomOut()
      }
      if (verticalMouseMove < -10) {
        zoomIn()
      }
    }
    platformZoomKey = e.metaKey
  }
  /* cmd-key while scrolling should zoom in and out */

  if (verticalMouseMove > 55 && platformZoomKey) {
    verticalMouseMove = -10
    zoomOut()
  }

  if (verticalMouseMove < -55 && platformZoomKey) {
    verticalMouseMove = -10
    zoomIn()
  }
})
