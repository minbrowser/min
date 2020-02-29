var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var searchEngine = require('util/searchEngine.js')

var Menu, MenuItem, clipboard // these are only loaded when the menu is shown

var webviewMenu = {
  menuData: null,
  showMenu: function (data, extraData) { // data comes from a context-menu event
    if (!Menu || !MenuItem || !clipboard) {
      Menu = remote.Menu
      MenuItem = remote.MenuItem
      clipboard = remote.clipboard
    }

    var menu = new Menu()
    var currentTab = tabs.get(tabs.getSelected())

    var menuSections = []

    /* Picture in Picture */

    if (extraData.hasVideo) {
      menuSections.push([
        new MenuItem({
          label: l('pictureInPicture'),
          click: function () {
            webviews.callAsync(tabs.getSelected(), 'send', ['enterPictureInPicture', {x: data.x, y: data.y}])
          }
        })
      ])
    }

    /* links */

    var link = data.linkURL || data.frameURL

    if (link === 'about:srcdoc') {
      /* srcdoc is used in reader view, but it can't actually be opened anywhere outside of the reader page */
      link = null
    }

    var mediaURL = data.srcURL

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
            browserUI.addTab(tabs.add({ url: link }), { enterEditMode: false })
          }
        }))
      }

      linkActions.push(new MenuItem({
        label: l('openInNewPrivateTab'),
        click: function () {
          browserUI.addTab(tabs.add({ url: link, private: true }), { enterEditMode: false })
        }
      }))

      menuSections.push(linkActions)
    } else if (mediaURL && data.mediaType === 'image') {
      /* images */
      /* we don't show the image actions if there are already link actions, because it makes the menu too long and because the image actions typically aren't very useful if the image is a link */

      var imageActions = [
        new MenuItem({
          label: (mediaURL.length > 60) ? mediaURL.substring(0, 60) + '...' : mediaURL,
          enabled: false
        })
      ]

      imageActions.push(new MenuItem({
        label: l('viewImage'),
        click: function () {
          browserUI.navigate(tabs.getSelected(), mediaURL)
        }
      }))

      if (!currentTab.private) {
        imageActions.push(new MenuItem({
          label: l('openImageInNewTab'),
          click: function () {
            browserUI.addTab(tabs.add({ url: mediaURL }), { enterEditMode: false })
          }
        }))
      }

      imageActions.push(new MenuItem({
        label: l('openImageInNewPrivateTab'),
        click: function () {
          browserUI.addTab(tabs.add({ url: mediaURL, private: true }), { enterEditMode: false })
        }
      }))

      menuSections.push(imageActions)

      menuSections.push([
        new MenuItem({
          label: l('saveImageAs'),
          click: function () {
            remote.getCurrentWebContents().downloadURL(mediaURL)
          }
        })
      ])
    }

    /* selected text */

    var selection = data.selectionText

    if (selection) {
      var textActions = [
        new MenuItem({
          label: l('searchWith').replace('%s', searchEngine.getCurrent().name),
          click: function () {
            var newTab = tabs.add({
              url: searchEngine.getCurrent().searchURL.replace('%s', encodeURIComponent(selection)),
              private: currentTab.private
            })
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

    if (link || (mediaURL && !mediaURL.startsWith('blob:'))) {
      clipboardActions.push(new MenuItem({
        label: l('copyLink'),
        click: function () {
          clipboard.writeText(link || mediaURL)
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
            webviews.goBackIgnoringRedirects(tabs.getSelected())
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

    // Electron's default menu position is sometimes wrong on Windows with a touchscreen
    // https://github.com/minbrowser/min/issues/903
    var offset = webviews.getViewBounds()
    menu.popup({
      x: data.x + offset.x,
      y: data.y + offset.y
    })
  },
  initialize: function () {
    webviews.bindEvent('context-menu', function (webview, tabId, e, data) {
      webviewMenu.menuData = data
      webviews.callAsync(tabs.getSelected(), 'send', ['getContextMenuData', {x: data.x, y: data.y}])
    })
    webviews.bindIPC('contextMenuData', function (webview, tabId, args) {
      webviewMenu.showMenu(webviewMenu.menuData, args[0])
      webview.menuData = null
    })
  }
}

module.exports = webviewMenu
