if (typeof require !== 'undefined') {
  var settings = require('util/settings/settings.js')
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

function initialize () {
  function themeChanged (value) {
    if (value === true) {
      enableDarkMode()
    } else {
      disableDarkMode()
    }
  }
  settings.listen('darkThemeIsActive', themeChanged)
}

if (typeof module !== 'undefined') {
  module.exports = { initialize }
} else {
  initialize()
}
