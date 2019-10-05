window.userDataPath = process.argv.filter(a => a.startsWith('--user-data-path='))[0].replace('--user-data-path=', '')

window.electron = require('electron')
window.fs = require('fs')
window.ipc = electron.ipcRenderer
window.remote = electron.remote
window.Dexie = require('dexie')

// add a class to the body for fullscreen status

ipc.on('enter-full-screen', function () {
  document.body.classList.add('fullscreen')
})

ipc.on('leave-full-screen', function () {
  document.body.classList.remove('fullscreen')
})

if (navigator.platform === 'MacIntel') {
  document.body.classList.add('mac')
  window.platformType = 'mac'
} else if (navigator.platform === 'Win32') {
  document.body.classList.add('windows')
  window.platformType = 'windows'
} else {
  document.body.classList.add('linux')
  window.platformType = 'linux'
}

if (window.platformType === 'windows') {
  ipc.on('maximize', function () {
    document.body.classList.add('maximized')
  })

  ipc.on('unmaximize', function () {
    document.body.classList.remove('maximized')
  })
}

// https://remysharp.com/2010/07/21/throttling-function-calls

window.throttle = function (fn, threshhold, scope) {
  threshhold || (threshhold = 250)
  var last,
    deferTimer
  return function () {
    var context = scope || this

    var now = +new Date
    var args = arguments
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

// https://remysharp.com/2010/07/21/throttling-function-calls

window.debounce = function (fn, delay) {
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

window.empty = function (node) {
  var n
  while (n = node.firstElementChild) {
    node.removeChild(n)
  }
}

/* prevent a click event from firing after dragging the window */

window.addEventListener('load', function () {
  var isMouseDown = false
  var isDragging = false
  var distance = 0

  document.body.addEventListener('mousedown', function () {
    isMouseDown = true
    isDragging = false
    distance = 0
  })

  document.body.addEventListener('mouseup', function () {
    isMouseDown = false
  })

  var dragHandles = document.getElementsByClassName('windowDragHandle')

  for (var i = 0; i < dragHandles.length; i++) {
    dragHandles[i].addEventListener('mousemove', function (e) {
      if (isMouseDown) {
        isDragging = true
        distance += Math.abs(e.movementX) + Math.abs(e.movementY)
      }
    })
  }

  document.body.addEventListener('click', function (e) {
    if (isDragging && distance >= 10.0) {
      e.stopImmediatePropagation()
      isDragging = false
    }
  }, true)
})

require('dbMigration.js')

require('util/settings/settings.js').initialize()
require('menuBarVisibility.js').initialize()
require('navbar/tabActivity.js').init()
require('navbar/tabColor.js').initialize()
require('navbar/goBackButton.js').initialize()
require('places/places.js').initialize()
require('downloadManager.js').initialize()
require('webviewMenu.js').initialize()
require('menuRenderer.js').initialize()
require('keybindings.js').initialize()

// default searchbar plugins

require('searchbar/placesPlugin.js').initialize()
require('searchbar/instantAnswerPlugin.js').initialize()
require('searchbar/openTabsPlugin.js').initialize()
require('searchbar/bangsPlugin.js').initialize()
require('searchbar/searchSuggestionsPlugin.js').initialize()
require('searchbar/placeSuggestionsPlugin.js').initialize()
require('searchbar/hostsSuggestionsPlugin.js').initialize()
require('searchbar/keywordSuggestionsPlugin.js').initialize()
require('searchbar/updateNotifications.js').initialize()
require('searchbar/restoreTaskPlugin.js').initialize()
