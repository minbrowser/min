const menuButton = document.getElementById('menu-button')

var menuButton = document.getElementById('menu-button')

window.showSecondaryMenu = function () {
  const navbar = document.getElementById('navbar')
  const rect = menuButton.getBoundingClientRect()
  const navbarRect = navbar.getBoundingClientRect()

  ipc.send('showSecondaryMenu', {
    x: Math.round(rect.left),
    y: Math.round(navbarRect.bottom)
  })
}

function initialize () {
  menuButton.addEventListener('click', function (e) {
    showSecondaryMenu()
  })

  keybindings.defineShortcut('showMenu', function () {
    if (!settings.get('useSeparateTitlebar') && (window.platformType === 'windows' || window.platformType === 'linux')) { showSecondaryMenu() }
  })
}

module.exports = { initialize, showSecondaryMenu }
