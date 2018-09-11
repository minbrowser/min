var browserUI = require('api-wrapper.js')

var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

module.exports = function makeImageMenuItems (image, isPrivate) {
  if (!Menu || !MenuItem || !clipboard) {
    Menu = remote.Menu
    MenuItem = remote.MenuItem
    clipboard = remote.clipboard
  }

  var imageActions = [
    new MenuItem({
      label: (image.length > 60) ? image.substring(0, 60) + '...' : image,
      enabled: false
    })
  ]

  imageActions.push(new MenuItem({
    label: l('viewImage'),
    click: function () {
      browserUI.navigate(tabs.getSelected(), image)
    }
  }))

  if (!isPrivate) {
    imageActions.push(new MenuItem({
      label: l('openImageInNewTab'),
      click: function () {
        browserUI.addTab(tabs.add({ url: image }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
      }
    }))
  }

  imageActions.push(new MenuItem({
    label: l('openImageInNewPrivateTab'),
    click: function () {
      browserUI.addTab(tabs.add({ url: image, private: true }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
    }
  }))

  return imageActions
}
