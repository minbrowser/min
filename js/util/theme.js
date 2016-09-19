function darkModeEnabled () {
  var hours = new Date().getHours()
  return hours > 21 || hours < 6
}

settings.get('darkMode', function (value) {
  if (value === true || darkModeEnabled()) {
    document.body.classList.add('dark-mode')
    window.isDarkMode = true
  } else {
    setInterval(function () {
      if (darkModeEnabled()) {
        document.body.classList.add('dark-mode')
        window.isDarkMode = true
      } else {
        document.body.classList.remove('dark-mode')
        window.isDarkMode = false
      }
    }, 10000)
  }
})
