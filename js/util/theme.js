function darkModeEnabled () {
  var hours = new Date().getHours()
  return hours > 21 || hours < 6
}

function darkModeUpdate () {
  settings.get('darkMode', function (value) {
    if (value === true || darkModeEnabled()) {
      document.body.classList.add('dark-mode')
      window.isDarkMode = true
    } else {
      document.body.classList.remove('dark-mode')
      window.isDarkMode = false
    }
  })
}

darkModeUpdate()
setInterval(darkModeUpdate, 10000)

window.addEventListener('minUpdatedSettings', function (event) {
  darkModeUpdate()
})