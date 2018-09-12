const makeLinkMenuItems = require('./linkMenuItems')
const makeImageMenuItems = require('./imageMenuItems')
const makeSelectionMenuItems = require('./selectionMenuItems')
const makeNavigationMenuItems = require('./navigationMenuItems')
const makeClipboardMenuItems = require("./clipboardMenuItems")

module.exports = function makeMenuSections (clipboard, data, focusMode, searchEngine) {
  var currentTabIsPrivate = tabs.get(tabs.getSelected()).private,
    isFocusMode = focusMode.enabled()

  var menuSections = []

  var link = data.linkURL || data.frameURL

  var image = data.srcURL

  /* we don't show the image actions if there are already link actions, because it makes the menu too long and because the image actions typically aren't very useful if the image is a link */
  menuSections.push(makeLinkMenuItems(link, currentTabIsPrivate, isFocusMode) 
                 || makeImageMenuItems(image, currentTabIsPrivate, isFocusMode))

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
  menuSections.push(makeSelectionMenuItems(selection, currentTabIsPrivate, searchEngine, isFocusMode))

  const clipboardActions = makeClipboardMenuItems(link, image, selection, data, clipboard)
  menuSections.push(clipboardActions)

  if(isFocusMode) {
    menuSections.push([{
      label: l('leaveFocusMode'),
      click: function (item, window) {
        alert("Unimplemented, yet.")
        // These do not work for some reason:
        window.isFocusMode = false 
        document.body.classList.remove('is-focus-mode')
        // At best, the focusMode object should provide a method to leave focus mode
      }
    }])
  } else {
    menuSections.push(makeNavigationMenuItems())
    menuSections.push([
      {
        label: l('inspectElement'),
        click: function () {
          webviews.get(tabs.getSelected()).inspectElement(data.x || 0, data.y || 0)
        }
      }
    ])
  }

  return menuSections.filter(s => !!s) // filter out empty sections
}
