var webviews = require('webviews.js')

var webviewGestures = {
  showBackArrow: function () {
    // this is temporarily disabled until we find a way to make it work with BrowserViews
    return
    var backArrow = document.getElementById('leftArrowContainer')
    backArrow.classList.toggle('shown')
    backArrow.classList.toggle('animating')
    setTimeout(function () {
      backArrow.classList.toggle('shown')
    }, 600)
    setTimeout(function () {
      backArrow.classList.toggle('animating')
    }, 900)
  },
  showForwardArrow: function () {
    // this is temporarily disabled until we find a way to make it work with BrowserViews
    return
    var forwardArrow = document.getElementById('rightArrowContainer')
    forwardArrow.classList.toggle('shown')
    forwardArrow.classList.toggle('animating')
    setTimeout(function () {
      forwardArrow.classList.toggle('shown')
    }, 600)
    setTimeout(function () {
      forwardArrow.classList.toggle('animating')
    }, 900)
  },
  zoomWebviewBy: function (tabId, amt) {
    webviews.callAsync(tabId, 'zoomFactor', function (err, oldFactor) {
      webviews.callAsync(tabId, 'zoomFactor', Math.min(webviewMaxZoom, Math.max(webviewMinZoom, oldFactor + amt)))
    })
  },
  zoomWebviewIn: function (tabId) {
    return this.zoomWebviewBy(tabId, 0.2)
  },
  zoomWebviewOut: function (tabId) {
    return this.zoomWebviewBy(tabId, -0.2)
  },
  resetWebviewZoom: function (tabId) {
    webviews.callAsync(tabId, 'zoomFactor', 1.0)
  }
}

var swipeGestureDistanceResetTimeout = -1
var swipeGestureScrollResetTimeout = -1;
var swipeGestureLowVelocityTimeout = -1
var swipeGestureDelay = 100 // delay before gesture is complete
var swipeGestureScrollDelay = 750;
var swipeGestureVelocityDelay = 70 // the time (in ms) that can elapse without a minimum amount of movement before the gesture is considered almost completed

var horizontalMouseMove = 0
var verticalMouseMove = 0

var leftMouseMove = 0;
var rightMouseMove = 0;

var beginningScrollLeft = null
var beginningScrollRight = null
var isInFrame = false

var hasShownSwipeArrow = false

var initialZoomKeyState = null
var initialSecondaryKeyState = null

var webviewMinZoom = 0.5
var webviewMaxZoom = 3.0

function resetDistanceCounters () {
  horizontalMouseMove = 0
  verticalMouseMove = 0
  leftMouseMove = 0
  rightMouseMove = 0

  hasShownSwipeArrow = false

  initialZoomKeyState = null
  initialSecondaryKeyState = null
}

function resetScrollCounters () {
  beginningScrollLeft = null
  beginningScrollRight = null
  isInFrame = false
}

function onSwipeGestureLowVelocity () {
  //we can't detect scroll position in an iframe, so never trigger a back gesture from it
  if (isInFrame) {
    return
  }

  webviews.callAsync(tabs.getSelected(), 'getZoomFactor', function(err, result) {
    const minScrollDistance = 150 * result;

      if ((leftMouseMove / rightMouseMove > 5) || (rightMouseMove / leftMouseMove > 5)) {
      // swipe to the left to go forward
      if (leftMouseMove - beginningScrollRight > minScrollDistance && Math.abs(horizontalMouseMove / verticalMouseMove) > 3) {
        if (beginningScrollRight < 5) {
          resetDistanceCounters()
          resetScrollCounters()
          webviews.callAsync(tabs.getSelected(), 'goForward')
        }
      }

      // swipe to the right to go backwards
      if (rightMouseMove + beginningScrollLeft > minScrollDistance && Math.abs(horizontalMouseMove / verticalMouseMove) > 3) {
        if (beginningScrollLeft < 5) {
          resetDistanceCounters()
          resetScrollCounters()
          webviews.goBackIgnoringRedirects(tabs.getSelected())
        }
      }
    }
  })
}

webviews.bindIPC('wheel-event', function (tabId, e) {
  e = JSON.parse(e)

  if (e.defaultPrevented) {
    return
  }

  verticalMouseMove += e.deltaY
  horizontalMouseMove += e.deltaX
  if (e.deltaX > 0) {
    leftMouseMove += e.deltaX
  } else {
    rightMouseMove += e.deltaX * -1
  }

  var platformZoomKey = ((navigator.platform === 'MacIntel') ? e.metaKey : e.ctrlKey)
  var platformSecondaryKey = ((navigator.platform === 'MacIntel') ? e.ctrlKey : false)

  if (beginningScrollLeft === null || beginningScrollRight === null) {
    webviews.callAsync(tabs.getSelected(), 'executeJavaScript', `
    (function () {
      var left = 0
      var right = 0
      var isInFrame = false;
      
      var n = document.elementFromPoint(${e.clientX}, ${e.clientY})
      while (n) {
        if (n.tagName === 'IFRAME') {
          isInFrame = true;
        }
        if (n.scrollLeft !== undefined) {
            left = Math.max(left, n.scrollLeft)
            right = Math.max(right, n.scrollWidth - n.clientWidth - n.scrollLeft)
        }
        n = n.parentElement
      }  
      return {left, right, isInFrame}
    })()
    `, function (err, result) {
      if (err) {
        console.warn(err)
        return
      }
      if (beginningScrollLeft === null || beginningScrollRight === null) {
        beginningScrollLeft = result.left
        beginningScrollRight = result.right
      }
      isInFrame = isInFrame || result.isInFrame
    })
  }

  if (initialZoomKeyState === null) {
    initialZoomKeyState = platformZoomKey
  }

  if (initialSecondaryKeyState === null) {
    initialSecondaryKeyState = platformSecondaryKey
  }

  if (Math.abs(e.deltaX) >= 20 || Math.abs(e.deltaY) >= 20) {
    clearTimeout(swipeGestureLowVelocityTimeout)
    swipeGestureLowVelocityTimeout = setTimeout(onSwipeGestureLowVelocity, swipeGestureVelocityDelay)

    if (horizontalMouseMove < -150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5 && !hasShownSwipeArrow) {
      hasShownSwipeArrow = true
      webviewGestures.showBackArrow()
    } else if (horizontalMouseMove > 150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5 && !hasShownSwipeArrow) {
      hasShownSwipeArrow = true
      webviewGestures.showForwardArrow()
    }
  }

  clearTimeout(swipeGestureDistanceResetTimeout)
  clearTimeout(swipeGestureScrollResetTimeout)
  swipeGestureDistanceResetTimeout = setTimeout(resetDistanceCounters, swipeGestureDelay)
  swipeGestureScrollResetTimeout = setTimeout(resetScrollCounters, swipeGestureScrollDelay)

  /* cmd-key while scrolling should zoom in and out */

  if (platformZoomKey && initialZoomKeyState) {
    if (verticalMouseMove > 50) {
      verticalMouseMove = -10
      webviewGestures.zoomWebviewOut(tabs.getSelected())
    }

    if (verticalMouseMove < -50) {
      verticalMouseMove = -10
      webviewGestures.zoomWebviewIn(tabs.getSelected())
    }
  }
})

module.exports = webviewGestures
