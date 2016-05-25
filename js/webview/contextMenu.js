var contextMenuDefaultPrevented = false

window.addEventListener('contextmenu', function (e) {
  contextMenuDefaultPrevented = e.defaultPrevented
})

/* gets page data used for the context menu */

ipc.on('getContextData', function (event, cxData) {
  // the page is overriding the contextmenu event
  if (contextMenuDefaultPrevented) {
    return
  }

  var element = document.elementFromPoint(cxData.x, cxData.y)

  if (element) {
    var src = element.href || element.src

    if (element.tagName === 'IMG' || element.tagName === 'PICTURE') {
      var image = element.src
    }
  }

  ipc.sendToHost('contextData', {
    selection: window.getSelection().toString(),
    src: src,
    image: image
  })
})
