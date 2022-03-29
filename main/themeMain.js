function isNightTime () {
  var hours = new Date().getHours()
  return (hours > 21 || hours < 6)
}

var themeInterval = null

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
    nativeTheme.themeSource = 'dark'
    return
  }

  // 2, undefined, or false: automatic dark mode following system
  if (value === undefined || value === 2 || value === false) {
    nativeTheme.themeSource = 'system'
  } else if (value === 0) {
    // 0: automatic dark mode at night
    if (isNightTime()) {
      nativeTheme.themeSource = 'dark'
    } else {
      nativeTheme.themeSource = 'light'
    }

    themeInterval = setInterval(function () {
      if (isNightTime()) {
        nativeTheme.themeSource = 'dark'
      } else {
        nativeTheme.themeSource = 'light'
      }
    }, 10000)
  } else if (value === -1) {
    // -1: never enable
    nativeTheme.themeSource = 'light'
  }
}

app.on('ready', function () {
  settings.listen('darkMode', themeSettingsChanged)

  nativeTheme.on('updated', function () {
    settings.set('darkThemeIsActive', nativeTheme.shouldUseDarkColors)
  })
})
