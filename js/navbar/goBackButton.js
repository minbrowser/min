const settings = require('util/settings.js')

var goBackButton = {
  element: document.getElementById('back-button'),
  update: function () {
    if (!tabs.get(tabs.getSelected()).url) {
      goBackButton.element.disabled = true
      return
    }
    webviews.callAsync(tabs.getSelected(), 'canGoBack', null, function (canGoBack) {
      goBackButton.element.disabled = !canGoBack
    })
  },
  initialize: function () {
    goBackButton.element.addEventListener('click', function (e) {
      webviews.goBackIgnoringRedirects(tabs.getSelected())
    })

    settings.get('historyButton', function (value) {
      if (value === true || value === undefined) {
        goBackButton.element.hidden = false
      } else {
        goBackButton.element.hidden = true
      }
    })

    tasks.on('tab-selected', this.update)
    webviews.bindEvent('did-navigate', this.update)
    webviews.bindEvent('did-navigate-in-page', this.update)
  }
}

module.exports = goBackButton
