var menuButton = document.getElementById('menu-button')

menuButton.addEventListener('click', function (e) {
  showMenu()
})

function showMenu () {
  var navbar = document.getElementById('navbar')
  var rect = menuButton.getBoundingClientRect()
  var navbarRect = navbar.getBoundingClientRect()

  ipc.send('showMenu', {
    x: Math.round(rect.left),
    y: Math.round(navbarRect.bottom),
    async: true
  })
}