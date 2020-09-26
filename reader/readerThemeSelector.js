var metaThemeElement = document.getElementById('meta-theme')

var themeSelectors = document.querySelectorAll('.theme-circle')

var metaThemeValues = {
  light: '#fff',
  dark: 'rgb(36, 41, 47)',
  sepia: 'rgb(247, 231, 199)'  
}

function isNight () {
  var hours = new Date().getHours()
  return hours > 21 || hours < 6
}

function setTheme (theme) {
  document.body.setAttribute('theme', theme)
  if (window.rframe && window.rframe.contentDocument) {
    rframe.contentDocument.body.setAttribute('theme', theme)
  }

  metaThemeElement.content = metaThemeValues[theme]

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
        } else if (globalDarkModeEnabled === 1 || globalDarkModeEnabled === true || isNight()) {
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
