// https://remysharp.com/2010/07/21/throttling-function-calls#comment-216435

function throttle (fn, threshhold, scope) {
  threshhold || (threshhold = 250)
  var last,
    deferTimer
  return function () {
    var context = scope || this

    var now = +new Date,
      args = arguments
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer)
      deferTimer = setTimeout(function () {
        last = now
        fn.apply(context, args)
      }, threshhold)
    } else {
      last = now
      fn.apply(context, args)
    }
  }
}

function smoothScrollBy (amt, duration) {
  var startingScrollTop = window.scrollY
  var startTime = Date.now()

  function incrementScroll () {
    var durationPassed = Date.now() - startTime
    window.scrollTo(0, startingScrollTop + (amt * Math.min(1, (durationPassed / duration))))
    if (durationPassed < duration) {
      requestAnimationFrame(incrementScroll)
    }
  }
  incrementScroll()
}

var startButton = document.getElementById('start-tour')
var tabImage = document.getElementById('tab-image')
var showMoreArrows = document.getElementsByClassName('arrow-showmore-icon')
var startBrowsingButtons = document.getElementsByClassName('start-browsing-onclick')

startButton.addEventListener('click', function (e) {
  requestAnimationFrame(function () {
    smoothScrollBy(window.innerHeight * 0.9, 250)
  })
})

window.addEventListener('scroll', throttle(function (e) {
  requestAnimationFrame(function () {
    if (window.scrollY < 20) {
      tabImage.classList.add('fade')
    } else {
      tabImage.classList.remove('fade')
    }
  })
}, 200))

for (var i = 0; i < showMoreArrows.length; i++) {
  showMoreArrows[i].addEventListener('click', function (e) {
    smoothScrollBy(window.innerHeight * 0.8, 250)
  })
}

// clicking this button will close the current tour tab, resulting in zero tabs. This will cause a new, empty tab to be created, and edit mode to be opened.
for (var i = 0; i < startBrowsingButtons.length; i++) {
  startBrowsingButtons[i].addEventListener('click', function (e) {
    window.close()
  })
}

// show the appropriate key (command or control) for keyboard shortcuts depending on the platform

if (navigator.platform === 'MacIntel') {
  var shortcutKey = '⌘'
} else {
  var shortcutKey = 'Ctrl'
}

var shortcutKeyNodes = document.getElementsByClassName('shortcut-key')

for (var i = 0; i < shortcutKeyNodes.length; i++) {
  shortcutKeyNodes[i].textContent = shortcutKey
}
