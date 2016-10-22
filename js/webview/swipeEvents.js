// https://remysharp.com/2010/07/21/throttling-function-calls

function debounce (fn, delay) {
  var timer = null
  return function () {
    var context = this
    var args = arguments
    clearTimeout(timer)
    timer = setTimeout(function () {
      fn.apply(context, args)
    }, delay)
  }
}

var horizontalMouseMove = 0;
var verticalMouseMove = 0;

function resetCounters() {
    horizontalMouseMove = 0;
    verticalMouseMove = 0;
}

var onSwipeGestureFinish = debounce(function () {

    //swipe to the left to go forward
    if(horizontalMouseMove > 150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5 && document.scrollingElement.scrollLeft + document.scrollingElement.clientWidth == document.scrollingElement.scrollWidth) {

      //if the page can be scrolled, increase the minimum swipe distance
      if(document.scrollingElement.scrollWidth === document.scrollingElement.clientWidth || horizontalMouseMove > 800) {
        resetCounters();
        window.history.go(1)
      }
    }

    //swipe to the right to go backwards
    if(horizontalMouseMove < -150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5 && document.scrollingElement.scrollLeft === 0) {
      
      if(document.scrollingElement.scrollWidth === document.scrollingElement.clientWidth || horizontalMouseMove < -800) {
        resetCounters();
       window.history.go(-1)
      }
    }

    resetCounters();
}, 70);

window.addEventListener('wheel', function(e) {

    horizontalMouseMove += e.deltaX
    verticalMouseMove += e.deltaY

    if(Math.abs(e.deltaX) >= 20 || Math.abs(e.deltaY) >= 20) {
        onSwipeGestureFinish();
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