var findinpage = {
  container: document.getElementById('findinpage-bar'),
  isEnabled: false,
  start: function (options) {
    findinpage.counter.textContent = ''

    findinpage.container.hidden = false
    findinpage.isEnabled = true
    findinpage.input.focus()
    findinpage.input.select()
  },
  end: function (options) {
    if (findinpage.isEnabled) {
      findinpage.container.hidden = true
      findinpage.isEnabled = false

      var webview = getWebview(tabs.getSelected())
      webview.stopFindInPage('keepSelection')
      webview.focus()
    }
  }
}

findinpage.input = findinpage.container.querySelector('.findinpage-input')
findinpage.previous = findinpage.container.querySelector('.findinpage-previous-match')
findinpage.next = findinpage.container.querySelector('.findinpage-next-match')
findinpage.counter = findinpage.container.querySelector('#findinpage-count')
findinpage.endButton = findinpage.container.querySelector('#findinpage-end')

findinpage.endButton.addEventListener('click', function () {
  findinpage.end()
})

findinpage.input.addEventListener('keyup', function (e) {
  if (this.value) {
    getWebview(tabs.getSelected()).findInPage(this.value)
  }
})

findinpage.previous.addEventListener('click', function (e) {
  getWebview(tabs.getSelected()).findInPage(findinpage.input.value, {
    forward: false,
    findNext: true
  })
  findinpage.input.focus()
})

findinpage.next.addEventListener('click', function (e) {
  getWebview(tabs.getSelected()).findInPage(findinpage.input.value, {
    forward: true,
    findNext: true
  })
  findinpage.input.focus()
})

bindWebviewEvent('found-in-page', function (e) {
  if (e.result.matches !== undefined) {
    if (e.result.matches === 1) {
      var text = ' match'
    } else {
      var text = ' matches'
    }

    findinpage.counter.textContent = e.result.matches + text
  }
})
