const webviews = require('webviews.js')

var goBackButton = {
  element: document.getElementById('back-button'),
  update: function () {
    if (!tabs.get(tabs.getSelected()).url) {
      goBackButton.element.disabled = true
      return
    }
    webviews.callAsync(tabs.getSelected(), 'canGoBack', function (err, canGoBack) {
      goBackButton.element.disabled = !canGoBack
    })
  },
  initialize: function () {
    goBackButton.element.addEventListener('click', function (e) {
      webviews.goBackIgnoringRedirects(tabs.getSelected())
    })

    // hide until initialized to reduce flickering
    goBackButton.element.hidden = false

    tasks.on('tab-selected', this.update)
    webviews.bindEvent('did-navigate', this.update)
    webviews.bindEvent('did-navigate-in-page', this.update)
  }
}

module.exports = goBackButton
