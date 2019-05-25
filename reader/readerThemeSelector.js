var iconElement = document.getElementById('page-icon')

var themeSelectors = document.querySelectorAll('.theme-circle')

function isNight () {
  var hours = new Date().getHours()
  return hours > 21 || hours < 6
}

function setTheme (theme) {
  document.body.setAttribute('theme', theme)
  if (window.rframe && window.rframe.contentDocument) {
    rframe.contentDocument.body.setAttribute('theme', theme)
  }

  iconElement.href = theme + 'Favicon.png'

  themeSelectors.forEach(function (el) {
    if (el.getAttribute('data-theme') === theme) {
      el.classList.add('selected')
    } else {
      el.classList.remove('selected')
    }
  })
}

function setReaderTheme () {
  settings.get('darkMode', function (globalDarkModeEnabled) {
    settings.get('readerDayTheme', function (readerDayTheme) {
      settings.get('readerNightTheme', function (readerNightTheme) {
        if (isNight() && readerNightTheme) {
          setTheme(readerNightTheme)
        } else if (!isNight() && readerDayTheme) {
          setTheme(readerDayTheme)
        } else if (globalDarkModeEnabled || isNight()) {
          setTheme('dark')
        } else {
          setTheme('light')
        }
      })
    })
  })
}

setReaderTheme()

// set theme when buttons selected

themeSelectors.forEach(function (el) {
  el.addEventListener('click', function () {
    var theme = this.getAttribute('data-theme')
    if (isNight()) {
      settings.set('readerNightTheme', theme, setReaderTheme)
    } else {
      settings.set('readerDayTheme', theme, setReaderTheme)
    }
  })
})
