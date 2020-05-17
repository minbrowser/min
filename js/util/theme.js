if (typeof require !== 'undefined') {
  var settings = require('util/settings/settings.js')
}

function shouldEnableDarkMode () {
  var hours = new Date().getHours()
  return (hours > 21 || hours < 6)
}

function enableDarkMode () {
  document.body.classList.add('dark-mode')
  window.isDarkMode = true
  requestAnimationFrame(function () {
    window.dispatchEvent(new CustomEvent('themechange'))
  })
}

function disableDarkMode () {
  document.body.classList.remove('dark-mode')
  window.isDarkMode = false
  requestAnimationFrame(function () {
    window.dispatchEvent(new CustomEvent('themechange'))
  })
}

var themeInterval = null

function initialize () {
  settings.listen('darkMode', function (value) {
    clearInterval(themeInterval)

    // 1 or true: dark mode is always enabled
    if (value === 1 || value === true) {
      enableDarkMode()
      return
    }

    // 0 or undefined: automatic dark mode
    if (value === undefined || value === 0 || value === false) {
      // If it is night and darkMode is set to auto/default
      if (shouldEnableDarkMode()) {
        enableDarkMode()
      } else {
        disableDarkMode()
      }

      themeInterval = setInterval(function () {
        if (shouldEnableDarkMode()) {
          if (!window.isDarkMode) {
            enableDarkMode()
          }
        } else if (window.isDarkMode) {
          disableDarkMode()
        }
      }, 10000)
    }

    // -1: never enable

    if (value === -1) {
      disableDarkMode()
    }
  })
}

if (typeof module !== 'undefined') {
  module.exports = {initialize}
} else {
  initialize()
}
