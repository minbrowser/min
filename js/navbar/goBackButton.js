const webviews = require('webviews.js')

var goBackButton = {
  container: document.getElementById('toolbar-navigation-buttons'),
  backButton: document.getElementById('back-button'),
  forwardButton: document.getElementById('forward-button'),
  update: function () {
    if (!tabs.get(tabs.getSelected()).url) {
      goBackButton.backButton.disabled = true
      goBackButton.forwardButton.disabled = true
      return
    }
    webviews.callAsync(tabs.getSelected(), 'canGoBack', function (err, canGoBack) {
      if (err) {
        return
      }
      goBackButton.backButton.disabled = !canGoBack
    })
    webviews.callAsync(tabs.getSelected(), 'canGoForward', function (err, canGoForward) {
      console.log(arguments)
      if (err) {
        return
      }
      goBackButton.forwardButton.disabled = !canGoForward
      if (canGoForward) {
        goBackButton.container.classList.add('can-go-forward')
      } else {
        goBackButton.container.classList.remove('can-go-forward')
      }
    })
  },
  initialize: function () {
    goBackButton.backButton.addEventListener('click', function (e) {
      webviews.goBackIgnoringRedirects(tabs.getSelected())
    })

    goBackButton.forwardButton.addEventListener('click', function () {
      webviews.callAsync(tabs.getSelected(), 'goForward')
    })

    tasks.on('tab-selected', this.update)
    webviews.bindEvent('did-navigate', this.update)
    webviews.bindEvent('did-navigate-in-page', this.update)
  }
}

module.exports = goBackButton
