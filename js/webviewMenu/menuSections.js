const menuItems = require("./menuItems")

module.exports = function makeMenuSections (clipboard, data, searchEngine) {
  const currentTabIsPrivate = tabs.get(tabs.getSelected()).private

  var menuSections = []

  const link = data.linkURL || data.frameURL
  const image = data.srcURL

  /* we don't show the image actions if there are already link actions, because it makes the menu too long and because the image actions typically aren't very useful if the image is a link */
  menuSections.push(menuItems.link(link, currentTabIsPrivate) 
                 || menuItems.image(image, currentTabIsPrivate))

  if (image) {
    menuSections.push([
      {
        label: l('saveImageAs'),
        click: function () {
          remote.getCurrentWebContents().downloadURL(image)
        }
      }
    ])
  }

  const selection = data.selectionText
  menuSections.push(menuItems.selection(selection, currentTabIsPrivate, searchEngine))

  const clipboardActions = menuItems.clipboard(link, image, selection, data, clipboard)
  menuSections.push(clipboardActions)

  menuSections.push(menuItems.navigation())

  /* inspect element */
  menuSections.push([
    {
      label: l('inspectElement'),
      click: function () {
        webviews.get(tabs.getSelected()).inspectElement(data.x || 0, data.y || 0)
      }
    }
  ])

  return menuSections.filter(s => !!s) // filter out empty sections
}
