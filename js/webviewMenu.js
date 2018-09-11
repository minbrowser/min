var browserUI = require('api-wrapper.js')

var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

const makeMenuItem = menuItem => new MenuItem(menuItem)
const makeMenuItems = menuItems => menuItems.map(makeMenuItem)

const makeMenuSections = require("webviewMenu/menuSections.js")

var webviewMenu = {
  showMenu: function (data, searchEngine) { // data comes from a context-menu event
    if (!Menu || !MenuItem || !clipboard) {
      Menu = remote.Menu
      MenuItem = remote.MenuItem
      clipboard = remote.clipboard
    }

    const menu = new Menu()

    makeMenuSections(data, searchEngine).forEach(function (section) {
      section.forEach(function (item) {
        menu.append(item)
      })
      menu.append(new MenuItem({ type: 'separator' }))
    })

    menu.popup(remote.getCurrentWindow())
  }
}
