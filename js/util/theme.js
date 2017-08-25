function shouldEnableDarkMode () {
  var hours = new Date().getHours()
  return hours > 21 || hours < 6
}

settings.get('darkMode', function (value) {
  if (value === true || shouldEnableDarkMode()) {
    document.body.classList.add('dark-mode')
    window.isDarkMode = true
    window.dispatchEvent(new CustomEvent('themechange'))
  } else {
    setInterval(function () {
      if (shouldEnableDarkMode()) {
        if (!window.isDarkMode) {
          document.body.classList.add('dark-mode')
          window.isDarkMode = true
          window.dispatchEvent(new CustomEvent('themechange'))
        }
      } else if (window.isDarkMode) {
        document.body.classList.remove('dark-mode')
        window.isDarkMode = false
        window.dispatchEvent(new CustomEvent('themechange'))
      }
    }, 10000)
  }
})
