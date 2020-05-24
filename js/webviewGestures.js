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

var swipeGestureTimeout = -1
var swipeGestureLowVelocityTimeout = -1
var swipeGestureDelay = 100 // delay before gesture is complete
var swipeGestureVelocityDelay = 70 // the time (in ms) that can elapse without a minimum amount of movement before the gesture is considered almost completed

var horizontalMouseMove = 0
var verticalMouseMove = 0

var beginningScrollLeft = null
var beginningScrollRight = null

var hasShownSwipeArrow = false

var initialZoomKeyState = null
var initialSecondaryKeyState = null

var webviewMinZoom = 0.5
var webviewMaxZoom = 3.0

function resetCounters () {
  horizontalMouseMove = 0

  verticalMouseMove = 0

  beginningScrollLeft = null
  beginningScrollRight = null

  hasShownSwipeArrow = false

  initialZoomKeyState = null
  initialSecondaryKeyState = null
}

function onSwipeGestureLowVelocity () {
  // swipe to the left to go forward
  if (horizontalMouseMove - beginningScrollRight > 150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5) {
    if (beginningScrollRight < 10) {
      resetCounters()
      webviews.callAsync(tabs.getSelected(), 'goForward')
    }
  }

  // swipe to the right to go backwards
  if (horizontalMouseMove + beginningScrollLeft < -150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5) {
    if (beginningScrollLeft < 10) {
      resetCounters()
      webviews.goBackIgnoringRedirects(tabs.getSelected())
    }
  }
}

function onSwipeGestureFinish () {
  resetCounters()
}

webviews.bindIPC('wheel-event', function (tabId, e) {
  e = JSON.parse(e)

  verticalMouseMove += e.deltaY
  horizontalMouseMove += e.deltaX

  var platformZoomKey = ((navigator.platform === 'MacIntel') ? e.metaKey : e.ctrlKey)
  var platformSecondaryKey = ((navigator.platform === 'MacIntel') ? e.ctrlKey : false)

  if (beginningScrollLeft === null || beginningScrollRight === null) {
    webviews.callAsync(tabs.getSelected(), 'executeJavaScript', `
    (function () {
      var left = 0
      var right = 0
      
      var n = document.elementFromPoint(${e.clientX}, ${e.clientY})
      while (n) {
        if (n.scrollLeft !== undefined) {
            left = Math.max(left, n.scrollLeft)
            right = Math.max(right, n.scrollWidth - n.clientWidth - n.scrollLeft)
        }
        n = n.parentElement
      }  
      return {left, right}
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

  clearTimeout(swipeGestureTimeout)
  swipeGestureTimeout = setTimeout(onSwipeGestureFinish, swipeGestureDelay)

  /* cmd-key while scrolling should zoom in and out */

  if (platformZoomKey && initialZoomKeyState) {
    if (verticalMouseMove > 55) {
      verticalMouseMove = -10
      webviewGestures.zoomWebviewOut(tabs.getSelected())
    }

    if (verticalMouseMove < -55) {
      verticalMouseMove = -10
      webviewGestures.zoomWebviewIn(tabs.getSelected())
    }
  }
})

module.exports = webviewGestures
