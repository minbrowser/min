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
          label: 'Open in New Tab',
          click: function () {
            addTab(tabs.add({ url: link }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
          }
        }))
      }

      linkActions.push(new MenuItem({
        label: 'Open in New Private Tab',
        click: function () {
          addTab(tabs.add({ url: link, private: true }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
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
        label: 'View Image',
        click: function () {
          navigate(tabs.getSelected(), image)
        }
      }))

      if (!currentTab.private) {
        imageActions.push(new MenuItem({
          label: 'Open Image in New Tab',
          click: function () {
            addTab(tabs.add({ url: image }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
          }
        }))
      }

      imageActions.push(new MenuItem({
        label: 'Open Image in New Private Tab',
        click: function () {
          addTab(tabs.add({ url: image, private: true }, tabs.getIndex(tabs.getSelected()) + 1), { enterEditMode: false })
        }
      }))

      menuSections.push(imageActions)

      menuSections.push([
        new MenuItem({
          label: 'Save Image As',
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
          label: 'Search with ' + currentSearchEngine.name,
          click: function () {
            var newTab = tabs.add({
              url: currentSearchEngine.searchURL.replace('%s', encodeURIComponent(selection)),
              private: currentTab.private
            }, tabs.getIndex(tabs.getSelected()) + 1)
            addTab(newTab, {
              enterEditMode: false
            })

            getWebview(newTab).focus()
          }
        })
      ]
      menuSections.push(textActions)
    }

    var clipboardActions = []

    if (link || image) {
      clipboardActions.push(new MenuItem({
        label: 'Copy Link',
        click: function () {
          clipboard.writeText(link || image)
        }
      }))
    }

    if (selection) {
      clipboardActions.push(new MenuItem({
        label: 'Copy',
        click: function () {
          clipboard.writeText(selection)
        }
      }))
    }

    if (data.editFlags.canPaste) {
      clipboardActions.push(new MenuItem({
        label: 'Paste',
        click: function () {
          getWebview(tabs.getSelected()).paste()
        }
      }))
    }

    if (clipboardActions.length !== 0) {
      menuSections.push(clipboardActions)
    }

    var navigationActions = [
      new MenuItem({
        label: 'Go Back',
        click: function () {
          try {
            getWebview(tabs.getSelected()).goBack()
          } catch (e) { }
        }
      }),
      new MenuItem({
        label: 'Go Forward',
        click: function () {
          try {
            getWebview(tabs.getSelected()).goForward()
          } catch (e) { }
        }
      })
    ]

    menuSections.push(navigationActions)

    /* inspect element */
    menuSections.push([
      new MenuItem({
        label: 'Inspect Element',
        click: function () {
          getWebview(tabs.getSelected()).inspectElement(data.x, data.y)
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

bindWebviewEvent('context-menu', function (e, data) {
  webviewMenu.showMenu(data)
}, true) // only available on webContents
