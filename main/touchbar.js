const TouchBar = require('electron').TouchBar
const nativeImage = require('electron').nativeImage
const { TouchBarLabel, TouchBarButton, TouchBarSpacer } = TouchBar

function buildTouchBar () {
  if (process.platform !== 'darwin') {
    return null
  }

  return new TouchBar({
    items: [
      new TouchBarButton({
        accessibilityLabel: l('goBack'),
        icon: nativeImage.createFromNamedImage('NSImageNameTouchBarGoBackTemplate', [-1, 0, 1]),
        click: function () {
          sendIPCToWindow(mainWindow, 'goBack')
        }
      }),
      new TouchBarSpacer({ size: 'flexible' }),
      new TouchBarButton({
        icon: nativeImage.createFromNamedImage('NSImageNameTouchBarSearchTemplate', [-1, 0, 1]),
        iconPosition: 'left',
        // TODO this is really hacky, find a better way to set the size
        label: '    ' + l('searchbarPlaceholder') + '                                ',
        click: function () {
          sendIPCToWindow(mainWindow, 'openEditor')
        }
      }),
      new TouchBarSpacer({ size: 'flexible' }),
      new TouchBarButton({
        icon: nativeImage.createFromNamedImage('NSImageNameTouchBarAdd', [-1, 0, 1]),
        accessibilityLabel: l('newTabAction'),
        click: function () {
          sendIPCToWindow(mainWindow, 'addTab')
        }
      }),
      new TouchBarButton({
        accessibilityLabel: l('viewTasks'),
        icon: nativeImage.createFromNamedImage('NSImageNameTouchBarListViewTemplate', [-1, 0, 1]),
        click: function () {
          sendIPCToWindow(mainWindow, 'toggleTaskOverlay')
        }
      })
    ]
  })
}
