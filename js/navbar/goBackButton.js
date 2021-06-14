const webviews = require('webviews.js')

function toggleForwardButton (key, type) {
  if (key !== 'Meta')
    return
  goBackButton.forward = (type === 'keydown' ? true : false)
  goBackButton.update()
}

var goBackButton = {
  forward: false,
  element: document.getElementById('back-button'),
  update: function () {
    // backward or forward button
    goBackButton.element.classList.remove('carbon:chevron-' + (!this.forward ? 'right' : 'left'))
    goBackButton.element.classList.add('carbon:chevron-' + (!this.forward ? 'left' : 'right'))

    if (!tabs.get(tabs.getSelected()).url) {
      goBackButton.element.disabled = true
      return
    }

    if (this.forward) {
      webviews.callAsync(tabs.getSelected(), 'canGoForward', function (err, canGoForward) {
        if (err)
          return
        goBackButton.element.disabled = !canGoForward
      })
    } else {
      webviews.callAsync(tabs.getSelected(), 'canGoBack', function (err, canGoBack) {
        if (err)
          return
        goBackButton.element.disabled = !canGoBack
      })
    }
  },
  initialize: function () {

    // listen for meta key
    ['keydown', 'keyup'].forEach(e => {
      document.addEventListener(e, ev => toggleForwardButton(ev.key, e))
    })
    webviews.bindEvent('before-input-event',  function (tabId, input) {
      toggleForwardButton(input.key, input.type.toLowerCase())
    })

    goBackButton.element.addEventListener('click', function (e) {
      if (goBackButton.forward) {
        webviews.callAsync(tabs.getSelected(), 'goForward')
      } else {
        webviews.goBackIgnoringRedirects(tabs.getSelected())
      }
    })

    // hide until initialized to reduce flickering
    goBackButton.element.hidden = false

    tasks.on('tab-selected', this.update)
    webviews.bindEvent('did-navigate', this.update)
    webviews.bindEvent('did-navigate-in-page', this.update)
  }
}

module.exports = goBackButton
