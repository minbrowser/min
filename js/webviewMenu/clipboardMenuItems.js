module.exports = function clipboardMenuItems (link, image, selection, data, clipboard) {
  var clipboardActions = []

  if (link || image) {
    clipboardActions.push({
      label: l('copyLink'),
      click: function () {
        clipboard.writeText(link || image)
      }
    })
  }

  if (selection) {
    clipboardActions.push({
      label: l('copy'),
      click: function () {
        clipboard.writeText(selection)
      }
    })
  }

  if (data.editFlags && data.editFlags.canPaste) {
    clipboardActions.push({
      label: l('paste'),
      click: function () {
        webviews.get(tabs.getSelected()).paste()
      }
    })
  }

  return clipboardActions
}
