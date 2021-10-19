if (typeof require !== 'undefined') {
  var settings = require('util/settings/settings.js')
}

function systemShouldEnableDarkMode () {
  return settings.list.systemShouldUseDarkColors
}

function isNightTime () {
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
  function themeSettingsChanged (value) {
    /*
    value is the value of the darkMode pref
    0 - automatic dark mode
    -1: never
    0: at night
    1: always
    2: follow system (default)
    true / false: legacy pref values, translate to always/system
    */
    clearInterval(themeInterval)

    // 1 or true: dark mode is always enabled
    if (value === 1 || value === true) {
      enableDarkMode()
      return
    }

    // 2, undefined, or false: automatic dark mode following system
    if (value === undefined || value === 2 || value === false) {
      if (systemShouldEnableDarkMode()) {
        enableDarkMode()
      } else {
        disableDarkMode()
      }

      themeInterval = setInterval(function () {
        if (systemShouldEnableDarkMode()) {
          if (!window.isDarkMode) {
            enableDarkMode()
          }
        } else if (window.isDarkMode) {
          disableDarkMode()
        }
      }, 10000)
    } else if (value === 0) {
      // 0: automatic dark mode at night
      if (isNightTime()) {
        enableDarkMode()
      } else {
        disableDarkMode()
      }

      themeInterval = setInterval(function () {
        if (isNightTime()) {
          if (!window.isDarkMode) {
            enableDarkMode()
          }
        } else if (window.isDarkMode) {
          disableDarkMode()
        }
      }, 10000)
    } else if (value === -1) {
      // -1: never enable
      disableDarkMode()
    }
  }
  settings.listen('darkMode', themeSettingsChanged)
  settings.listen('systemShouldUseDarkColors', function () {
    // the settings API differs between the UI process and tabs
    if (typeof process === 'undefined') {
      settings.get('darkMode', themeSettingsChanged)
    } else {
      themeSettingsChanged(settings.get('darkMode'))
    }
  })
}

if (typeof module !== 'undefined') {
  module.exports = { initialize }
} else {
  initialize()
}
