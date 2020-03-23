if (typeof require !== 'undefined') {
  var settings = require('util/settings/settings.js')
}

function shouldEnableDarkMode () {
  var hours = new Date().getHours()
  return hours > 21 || hours < 6
}

function enableDarkMode () {
  document.body.classList.add('dark-mode')
  window.isDarkMode = true
  window.dispatchEvent(new CustomEvent('themechange'))
}

function disableDarkMode () {
  document.body.classList.remove('dark-mode')
  window.isDarkMode = false
  window.dispatchEvent(new CustomEvent('themechange'))
}

var themeInterval = null

function initialize () {
  settings.listen('darkMode', function (value) {
    clearInterval(themeInterval)

    if (value === true) {
      enableDarkMode()
      return
    }

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
  })
}

if (typeof module !== 'undefined') {
  module.exports = {initialize}
} else {
  initialize()
}
