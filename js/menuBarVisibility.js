const settings = require('util/settings/settings.js')

function initialize () {
  if (settings.get('menuBarVisible') === false) {
    remote.getCurrentWindow().setMenuBarVisibility(false)
  } else {
      // menu bar should be visible, do nothing
  }
}

function showMenuBar () {
  remote.getCurrentWindow().setMenuBarVisibility(true)
  settings.set('menuBarVisible', true)
}

function hideMenuBar () {
  remote.getCurrentWindow().setMenuBarVisibility(false)
  settings.set('menuBarVisible', false)
}

function toggleMenuBar () {
  if (navigator.platform === 'Win32') {
    // use secondary menu instead of application menu on Windows
    return showSecondaryMenu()
  }
  if (settings.get('menuBarVisible') === false) {
    showMenuBar()
  } else {
    hideMenuBar()
  }
}

module.exports = {initialize, toggleMenuBar}
