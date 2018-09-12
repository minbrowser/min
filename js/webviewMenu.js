var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

const makeMenuItem = menuItem => new MenuItem(menuItem)
const makeMenuItems = menuItems => menuItems.map(makeMenuItem)

const makeMenuSections = require('webviewMenu/menuSections.js')

const addSeparatorToSection = section => [...section, new MenuItem({ type: 'separator' })]

module.exports = function createWebviewMenu (data, focusMode, searchEngine) { // data comes from a context-menu event
  if (!Menu || !MenuItem || !clipboard) {
    Menu = remote.Menu
    MenuItem = remote.MenuItem
    clipboard = remote.clipboard
  }

  const menu = new Menu()

  makeMenuSections(clipboard, data, focusMode, searchEngine)
      .map(addSeparatorToSection)
      .map(makeMenuItems)
      .forEach(section => section.forEach(item => menu.append(item)))

  return menu
}
