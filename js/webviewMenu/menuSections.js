const makeLinkMenuItems = require("./linkMenuItems")
const makeImageMenuItems = require("./imageMenuItems")
const makeSelectionMenuItems = require("./selectionMenuItems")
const makeNavigationMenuItems = require("./navigationMenuItems")

var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

module.exports = function makeMenuSections (data, searchEngine) {
  if (!Menu || !MenuItem || !clipboard) {
    Menu = remote.Menu
    MenuItem = remote.MenuItem
    clipboard = remote.clipboard
  }

  var currentTabIsPrivate = tabs.get(tabs.getSelected()).private

  var menuSections = []

  /* links */

  var link = data.linkURL || data.frameURL

  var image = data.srcURL

  if (link) {
    menuSections.push(makeLinkMenuItems(link, currentTabIsPrivate))
  } 
  if (image) {
    menuSections.push(makeImageMenuItems(image, currentTabIsPrivate))

    menuSections.push([
      new MenuItem({
        label: l('saveImageAs'),
        click: function () {
          remote.getCurrentWebContents().downloadURL(image)
        }
      })
    ])
  }

  /* selected text */

  var selection = data.selectionText

  if (selection) {
    menuSections.push(makeSelectionMenuItems(selection, currentTabIsPrivate, searchEngine))
  }

  var clipboardActions = []

  if (link || image) {
    clipboardActions.push(new MenuItem({
      label: l('copyLink'),
      click: function () {
        clipboard.writeText(link || image)
      }
    }))
  }

  if (selection) {
    clipboardActions.push(new MenuItem({
      label: l('copy'),
      click: function () {
        clipboard.writeText(selection)
      }
    }))
  }

  if (data.editFlags && data.editFlags.canPaste) {
    clipboardActions.push(new MenuItem({
      label: l('paste'),
      click: function () {
        webviews.get(tabs.getSelected()).paste()
      }
    }))
  }

  if (clipboardActions.length !== 0) {
    menuSections.push(clipboardActions)
  }

  menuSections.push(makeNavigationMenuItems())

  /* inspect element */
  menuSections.push([
    new MenuItem({
      label: l('inspectElement'),
      click: function () {
        webviews.get(tabs.getSelected()).inspectElement(data.x || 0, data.y || 0)
      }
    })
  ])

  return menuSections
}
