/* list of the available custom !bangs */

registerCustomBang({
  phrase: '!settings',
  snippet: 'View Settings',
  isAction: true,
  fn: function (text) {
    navigate(tabs.getSelected(), 'file://' + __dirname + '/pages/settings/index.html')
  }
})

registerCustomBang({
  phrase: '!back',
  snippet: 'Go Back',
  isAction: true,
  fn: function (text) {
    try {
      getWebview(tabs.getSelected()).goBack()
    } catch(e) {}
  }
})

registerCustomBang({
  phrase: '!forward',
  snippet: 'Go Forward',
  isAction: true,
  fn: function (text) {
    try {
      getWebview(tabs.getSelected()).goForward()
    } catch(e) {}
  }
})

registerCustomBang({
  phrase: '!screenshot',
  snippet: 'Take a Screenshot',
  isAction: true,
  fn: function (text) {
    setTimeout(function () { // wait until the next frame so that the searchbar is hidden
      var rect = getWebview(tabs.getSelected()).getBoundingClientRect()

      var imageRect = {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }

      remote.getCurrentWindow().capturePage(imageRect, function (image) {
        remote.getCurrentWebContents().downloadURL(image.toDataURL())
      })
    }, 16)
  }
})
