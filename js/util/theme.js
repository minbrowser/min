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

settings.listen('darkMode', function (value) {
  if (value === true) {
    enableDarkMode()
    return
  }

  if (shouldEnableDarkMode()) {
    enableDarkMode()
  } else {
    disableDarkMode()
  }

  clearInterval(themeInterval)
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
