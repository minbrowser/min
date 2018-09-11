var browserUI = require('api-wrapper.js')

var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

module.exports = function makeLinkMenuItems (link, isPrivate) {
  if (!Menu || !MenuItem || !clipboard) {
    Menu = remote.Menu
    MenuItem = remote.MenuItem
    clipboard = remote.clipboard
  }

  var linkActions = [
    new MenuItem({
      label: (link.length > 60) ? link.substring(0, 60) + '...' : link,
      enabled: false
    })
  ]

  if (!isPrivate) {
    linkActions.push(new MenuItem({
      label: l('openInNewTab'),
      click: function () {
        browserUI.addTab(tabs.add({ url: link }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
      }
    }))
  }

  linkActions.push(new MenuItem({
    label: l('openInNewPrivateTab'),
    click: function () {
      browserUI.addTab(tabs.add({ url: link, private: true }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
    }
  }))

  return linkActions
}
