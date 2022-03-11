const TouchBar = require('electron').TouchBar
const nativeImage = require('electron').nativeImage
const { TouchBarLabel, TouchBarButton, TouchBarSpacer } = TouchBar

function buildTouchBar () {
  if (process.platform !== 'darwin') {
    return null
  }

  function getTouchBarIcon (name) {
    // the icons created by nativeImage are too big by default, shrink them to the correct size for the touchbar
    var image = nativeImage.createFromNamedImage(name, [-1, 0, 1])
    var size = image.getSize()
    return image.resize({
      width: Math.round(size.width * 0.65),
      height: Math.round(size.height * 0.65)
    })
  }
  return new TouchBar({
    items: [
      new TouchBarButton({
        accessibilityLabel: l('goBack'),
        icon: getTouchBarIcon('NSImageNameTouchBarGoBackTemplate'),
        click: function () {
          sendIPCToWindow(mainWindow, 'goBack')
        }
      }),
      new TouchBarButton({
        accessibilityLabel: l('goForward'),
        icon: getTouchBarIcon('NSImageNameTouchBarGoForwardTemplate'),
        click: function () {
          sendIPCToWindow(mainWindow, 'goForward')
        }
      }),
      new TouchBarSpacer({ size: 'flexible' }),
      new TouchBarButton({
        icon: getTouchBarIcon('NSImageNameTouchBarSearchTemplate'),
        iconPosition: 'left',
        // TODO this is really hacky, find a better way to set the size
        label: '    ' + l('searchbarPlaceholder') + '                     ',
        click: function () {
          sendIPCToWindow(mainWindow, 'openEditor')
        }
      }),
      new TouchBarSpacer({ size: 'flexible' }),
      new TouchBarButton({
        icon: getTouchBarIcon('NSImageNameTouchBarAdd'),
        accessibilityLabel: l('newTabAction'),
        click: function () {
          sendIPCToWindow(mainWindow, 'addTab')
        }
      }),
      new TouchBarButton({
        accessibilityLabel: l('viewTasks'),
        icon: getTouchBarIcon('NSImageNameTouchBarListViewTemplate'),
        click: function () {
          sendIPCToWindow(mainWindow, 'toggleTaskOverlay')
        }
      })
    ]
  })
}
