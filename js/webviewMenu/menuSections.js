const makeLinkMenuItems = require('./linkMenuItems')
const makeImageMenuItems = require('./imageMenuItems')
const makeSelectionMenuItems = require('./selectionMenuItems')
const makeNavigationMenuItems = require('./navigationMenuItems')

module.exports = function makeMenuSections (clipboard, data, searchEngine) {
  var currentTabIsPrivate = tabs.get(tabs.getSelected()).private

  var menuSections = []

  var link = data.linkURL || data.frameURL

  var image = data.srcURL

  /* we don't show the image actions if there are already link actions, because it makes the menu too long and because the image actions typically aren't very useful if the image is a link */
  if (link) {
    menuSections.push(makeLinkMenuItems(link, currentTabIsPrivate))
  } else if (image) {
    menuSections.push(makeImageMenuItems(image, currentTabIsPrivate))

    menuSections.push([
      {
        label: l('saveImageAs'),
        click: function () {
          remote.getCurrentWebContents().downloadURL(image)
        }
      }
    ])
  }

  /* selected text */

  var selection = data.selectionText

  if (selection) {
    menuSections.push(makeSelectionMenuItems(selection, currentTabIsPrivate, searchEngine))
  }

  const clipboardActions = clipboardMenuItems(link, image, selection, data, clipboard)
  if (clipboardActions.length !== 0) {
    menuSections.push(clipboardActions)
  }

  menuSections.push(makeNavigationMenuItems())

  /* inspect element */
  menuSections.push([
    {
      label: l('inspectElement'),
      click: function () {
        webviews.get(tabs.getSelected()).inspectElement(data.x || 0, data.y || 0)
      }
    }
  ])

  return menuSections
}
