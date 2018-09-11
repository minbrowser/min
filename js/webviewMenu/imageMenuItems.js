var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

module.exports = function makeImageMenuItems (image, isPrivate) {
      /* images */
      /* we don't show the image actions if there are already link actions, because it makes the menu too long and because the image actions typically aren't very useful if the image is a link */
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
