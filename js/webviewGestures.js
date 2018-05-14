var webviewGestures = {
  showBackArrow: function () {
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
    var w = webviews.get(tabId)
    w.getZoomFactor(function (existingZoom) {
      var newZoom = Math.min(webviewMaxZoom, Math.max(webviewMinZoom, existingZoom + amt))
      w.setZoomFactor(newZoom)
    })
  },
  zoomWebviewIn: function (tabId) {
    return this.zoomWebviewBy(tabId, 0.2)
  },
  zoomWebviewOut: function (tabId) {
    return this.zoomWebviewBy(tabId, -0.2)
  },
  resetWebviewZoom: function (tabId) {
    webviews.get(tabId).setZoomFactor(1.0)
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
      webviews.get(tabs.getSelected()).goForward()
    }
  }

  // swipe to the right to go backwards
  if (horizontalMouseMove + beginningScrollLeft < -150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5) {
    if (beginningScrollLeft < 10) {
      resetCounters()
      webviews.get(tabs.getSelected()).goBack()
    }
  }
}

function onSwipeGestureFinish () {
  resetCounters()
}

window.addEventListener('wheel', function (e) {
  var webview = webviews.get(tabs.getSelected())

  if (e.target.tagName !== 'WEBVIEW') {
    return
  }

  verticalMouseMove += e.deltaY
  horizontalMouseMove += e.deltaX

  var platformZoomKey = ((navigator.platform === 'MacIntel') ? e.metaKey : e.ctrlKey)
  var platformSecondaryKey = ((navigator.platform === 'MacIntel') ? e.ctrlKey : false)

  if (beginningScrollLeft === null || beginningScrollRight === null) {
    webview.executeJavaScript('({left: document.scrollingElement.scrollLeft, right: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth - document.scrollingElement.scrollLeft})', false, function (result) {
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
      if (webview.canGoBack()) {
        webviewGestures.showBackArrow()
      }
    } else if (horizontalMouseMove > 150 && Math.abs(horizontalMouseMove / verticalMouseMove) > 2.5 && !hasShownSwipeArrow) {
      hasShownSwipeArrow = true
      if (webview.canGoForward()) {
        webviewGestures.showForwardArrow()
      }
    }
  }

  clearTimeout(swipeGestureTimeout)
  swipeGestureTimeout = setTimeout(onSwipeGestureFinish, swipeGestureDelay)

  /* if platform is Mac, enable pinch zoom
  	the browser engine detects pinches as ctrl+mousewheel on Mac,
  	therefore, it should not affect other platforms that uses ctrl+mousewheel to zoom.
  */
  if (navigator.platform === 'MacIntel') {
    if (initialSecondaryKeyState && !e.defaultPrevented) {
      if (verticalMouseMove > 10) {
        webviewGestures.zoomWebviewOut(tabs.getSelected())
        verticalMouseMove = 0
      }
      if (verticalMouseMove < -10) {
        webviewGestures.zoomWebviewIn(tabs.getSelected())
        verticalMouseMove = 0
      }

      e.preventDefault()
    }
  }

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

    e.preventDefault()
  }
})
