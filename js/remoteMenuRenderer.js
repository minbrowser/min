/*
Passes a context menu template to the main process (where the menu is created)
and listens for click events on it.
*/

var menuCallbacks = {}

var nextMenuId = 0

function open (menuTemplate, x, y) {
  nextMenuId++
  menuCallbacks[nextMenuId] = {}
  var nextItemId = 0
  function prepareToSend (menuPart) {
    if (menuPart instanceof Array) {
      return menuPart.map(item => prepareToSend(item))
    } else {
      if (typeof menuPart.click === 'function') {
        menuCallbacks[nextMenuId][nextItemId] = menuPart.click
        menuPart.click = nextItemId
        nextItemId++
      }
      return menuPart
    }
  }

  ipc.send('open-context-menu', {
    id: nextMenuId,
    template: prepareToSend(menuTemplate),
    x,
    y
  })
}

ipc.on('context-menu-item-selected', function (e, data) {
  menuCallbacks[data.menuId][data.itemId]()
})

ipc.on('context-menu-will-close', function (e, data) {
  // delay close event until after selected event has been received
  setTimeout(function () {
    delete menuCallbacks[data.menuId]
  }, 16)
})

module.exports = { open }

