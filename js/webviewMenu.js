var browserUI = require('api-wrapper.js')

var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

var webviewMenu = {
  showMenu: function (data) { // data comes from a context-menu event
    if (!Menu || !MenuItem || !clipboard) {
      Menu = remote.Menu
      MenuItem = remote.MenuItem
      clipboard = remote.clipboard
    }

    var menu = new Menu()
    var currentTab = tabs.get(tabs.getSelected())

    var menuSections = []

    /* links */

    var link = data.linkURL || data.frameURL

    var image = data.srcURL

    if (link) {
      var linkActions = [
        new MenuItem({
          label: (link.length > 60) ? link.substring(0, 60) + '...' : link,
          enabled: false
        })
      ]

      if (!currentTab.private) {
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

      menuSections.push(linkActions)
    } else if (image) {
      /* images */
      /* we don't show the image actions if there are already link actions, because it makes the menu too long and because the image actions typically aren't very useful if the image is a link */

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

      if (!currentTab.private) {
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

      menuSections.push(imageActions)

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
      var textActions = [
        new MenuItem({
          label: l('searchWith').replace('%s', currentSearchEngine.name),
          click: function () {
            var newTab = tabs.add({
              url: currentSearchEngine.searchURL.replace('%s', encodeURIComponent(selection)),
              private: currentTab.private
            }, tabs.getIndex(tabs.getSelected()) + 1)
            browserUI.addTab(newTab, {
              enterEditMode: false
            })

            webviews.get(newTab).focus()
          }
        })
      ]
      menuSections.push(textActions)
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

    var navigationActions = [
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

    menuSections.push(navigationActions)

    /* inspect element */
    menuSections.push([
      new MenuItem({
        label: l('inspectElement'),
        click: function () {
          webviews.get(tabs.getSelected()).inspectElement(data.x || 0, data.y || 0)
        }
      })
    ])

    menuSections.forEach(function (section) {
      section.forEach(function (item) {
        menu.append(item)
      })
      menu.append(new MenuItem({ type: 'separator' }))
    })

    menu.popup(remote.getCurrentWindow())
  }
}

webviews.bindEvent('context-menu', function (e, data) {
  webviewMenu.showMenu(data)
})
