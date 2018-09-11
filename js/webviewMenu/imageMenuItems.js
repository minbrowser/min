var browserUI = require('api-wrapper.js')

module.exports = function makeImageMenuItems (image, isPrivate) {
  if (!image) return []

  var imageActions = [
    {
      label: (image.length > 60) ? image.substring(0, 60) + '...' : image,
      enabled: false
    }
  ]

  imageActions.push({
    label: l('viewImage'),
    click: function () {
      browserUI.navigate(tabs.getSelected(), image)
    }
  })

  if (!isPrivate) {
    imageActions.push({
      label: l('openImageInNewTab'),
      click: function () {
        browserUI.addTab(tabs.add({ url: image }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
      }
    })
  }

  imageActions.push({
    label: l('openImageInNewPrivateTab'),
    click: function () {
      browserUI.addTab(tabs.add({ url: image, private: true }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
    }
  })

  return imageActions
}
