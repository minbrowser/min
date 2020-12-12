const menuButton = document.getElementById('menu-button')

menuButton.addEventListener('click', function (e) {
  showSecondaryMenu()
})

window.showSecondaryMenu = function () {
  const navbar = document.getElementById('navbar')
  const rect = menuButton.getBoundingClientRect()
  const navbarRect = navbar.getBoundingClientRect()

  ipc.send('showSecondaryMenu', {
    x: Math.round(rect.left),
    y: Math.round(navbarRect.bottom)
  })
}

keybindings.defineShortcut('showMenu', function () {
  if (!settings.get('useSeparateTitlebar') && (window.platformType === 'windows' || window.platformType === 'linux')) { showSecondaryMenu() }
})
