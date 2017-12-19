var menuButton = document.getElementById('menu-button')

menuButton.addEventListener('click', function (e) {
  showSecondaryMenu()
})

function showSecondaryMenu () {
  var navbar = document.getElementById('navbar')
  var rect = menuButton.getBoundingClientRect()
  var navbarRect = navbar.getBoundingClientRect()

  ipc.send('showSecondaryMenu', {
    x: Math.round(rect.left),
    y: Math.round(navbarRect.bottom),
    async: true
  })
}
