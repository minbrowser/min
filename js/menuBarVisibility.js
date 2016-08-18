settings.get('menuBarVisible', function (value) {
  if (value === false) {
    remote.getCurrentWindow().setMenuBarVisibility(false)
  } else {
    // menu bar should be visible, do nothing
  }
})

function showMenuBar () {
  remote.getCurrentWindow().setMenuBarVisibility(true)
  settings.set('menuBarVisible', true)
}

function hideMenuBar () {
  remote.getCurrentWindow().setMenuBarVisibility(false)
  settings.set('menuBarVisible', false)
}

function toggleMenuBar () {
  settings.get('menuBarVisible', function (value) {
    if (value === false) {
      showMenuBar()
    } else {
      hideMenuBar()
    }
  })
}
