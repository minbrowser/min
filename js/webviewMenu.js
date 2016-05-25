var Menu = remote.Menu
var MenuItem = remote.MenuItem
var clipboard = remote.clipboard

var webviewMenu = {
  cache: {
    event: null,
    webview: null
  },
  loadFromContextData: function (IPCdata) {
    var tab = tabs.get(tabs.getSelected())

    var event = webviewMenu.cache.event

    var menu = new Menu()

    // if we have a link (an image source or an href)
    if (IPCdata.src && !isFocusMode) { // new tabs can't be created in focus mode
      // show what the item is

      if (IPCdata.src.length > 60) {
        var caption = IPCdata.src.substring(0, 60) + '...'
      } else {
        var caption = IPCdata.src
      }

      menu.append(new MenuItem({
        label: caption,
        enabled: false
      }))
      menu.append(new MenuItem({
        label: 'Open in New Tab',
        click: function () {
          var newTab = tabs.add({
            url: IPCdata.src,
            private: tab.private
          }, tabs.getIndex(tabs.getSelected()) + 1)

          addTab(newTab, {
            enterEditMode: false
          })

          getWebview(newTab).focus()
        }
      }))

      // if the current tab isn't private, we want to provide an option to open the link in a private tab

      if (!tab.private) {
        menu.append(new MenuItem({
          label: 'Open in New Private Tab',
          click: function () {
            var newTab = tabs.add({
              url: IPCdata.src,
              private: true
            }, tabs.getIndex(tabs.getSelected()) + 1)
            addTab(newTab, {
              enterEditMode: false
            })

            getWebview(newTab).focus()
          }
        }))
      }

      if (!IPCdata.image) {
        menu.append(new MenuItem({
          type: 'separator'
        }))

        menu.append(new MenuItem({
          label: 'Save Link As...',
          click: function () {
            remote.getCurrentWebContents().downloadURL(IPCdata.src)
          }
        }))
      }

      menu.append(new MenuItem({
        type: 'separator'
      }))

      menu.append(new MenuItem({
        label: 'Copy link',
        click: function () {
          clipboard.writeText(IPCdata.src)
        }
      }))
    }

    if (IPCdata.selection) {
      menu.append(new MenuItem({
        label: 'Copy',
        click: function () {
          clipboard.writeText(IPCdata.selection)
        }
      }))

      menu.append(new MenuItem({
        type: 'separator'
      }))

      menu.append(new MenuItem({
        label: 'Search with ' + currentSearchEngine.name,
        click: function () {
          var newTab = tabs.add({
            url: currentSearchEngine.searchURL.replace('%s', encodeURIComponent(IPCdata.selection)),
            private: tab.private
          })
          addTab(newTab, {
            enterEditMode: false
          })

          getWebview(newTab).focus()
        }
      }))
    }

    if (IPCdata.image) {
      menu.append(new MenuItem({
        label: 'View image',
        click: function () {
          navigate(webviewMenu.cache.tab, IPCdata.image)
        }
      }))
      menu.append(new MenuItem({
        label: 'Save image',
        click: function () {
          remote.getCurrentWebContents().downloadURL(IPCdata.image)
        }
      }))
    }

    menu.append(new MenuItem({
      label: 'Inspect Element',
      click: function () {
        webviewMenu.cache.webview.inspectElement(event.x, event.y)
      }
    }))

    menu.popup(remote.getCurrentWindow())
  },
  /* cxevent: a contextmenu event. Can be a jquery event or a regular event. */
  show: function (cxevent) {
    var event = cxevent.originalEvent || cxevent
    webviewMenu.cache.event = event

    var currentTab = tabs.getSelected()
    var webview = getWebview(currentTab)

    webviewMenu.cache.tab = currentTab
    webviewMenu.cache.webview = webview

    webview.send('getContextData', {
      x: event.offsetX,
      y: event.offsetY
    }) // some menu items require recieving data from the page
  }
}

bindWebviewIPC('contextData', function (webview, tabId, arguements) {
  webviewMenu.loadFromContextData(arguements[0])
})
