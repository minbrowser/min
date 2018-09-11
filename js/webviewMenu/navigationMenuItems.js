var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

module.exports = function makeNavigationMenuItems () {
  if (!Menu || !MenuItem || !clipboard) {
    Menu = remote.Menu
    MenuItem = remote.MenuItem
    clipboard = remote.clipboard
  }

  return [
    new MenuItem({
      label: l('goBack'),
      click: function () {
        try {
          webviews.get(tabs.getSelected()).goBack()
        } catch (e) {}
      }
    }),
    new MenuItem({
      label: l('goForward'),
      click: function () {
        try {
          webviews.get(tabs.getSelected()).goForward()
        } catch (e) {}
      }
    })
  ]
}
