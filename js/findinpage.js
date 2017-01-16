var findinpage = {
  container: document.getElementById('findinpage-bar'),
  input: document.getElementById('findinpage-input'),
  counter: document.getElementById('findinpage-count'),
  previous: document.getElementById('findinpage-previous-match'),
  next: document.getElementById('findinpage-next-match'),
  endButton: document.getElementById('findinpage-end'),
  activeWebview: null,
  start: function (options) {
    findinpage.activeWebview = getWebview(tabs.getSelected())

    findinpage.counter.textContent = ''
    findinpage.container.hidden = false
    findinpage.input.focus()
    findinpage.input.select()

    if (findinpage.input.value) {
      findinpage.activeWebview.findInPage(findinpage.input.value)
    }
  },
  end: function (options) {
    findinpage.container.hidden = true

    if (findinpage.activeWebview) {
      findinpage.activeWebview.stopFindInPage('keepSelection')
      if (findinpage.input === document.activeElement) {
        findinpage.activeWebview.focus()
      }
    }

    findinpage.activeWebview = null
  }
}

findinpage.input.addEventListener('blur', function (e) {
  if (!e.relatedTarget || !e.relatedTarget.classList.contains('findinpage-control')) {
    findinpage.end()
  }
})

findinpage.endButton.addEventListener('click', function () {
  findinpage.end()
})

findinpage.input.addEventListener('input', function (e) {
  if (this.value) {
    findinpage.activeWebview.findInPage(this.value)
  }
})

findinpage.input.addEventListener('keypress', function (e) {
  if (e.keyCode === 13) {
    findinpage.activeWebview.findInPage(findinpage.input.value, {
      forward: true,
      findNext: true
    })
  }
})

findinpage.previous.addEventListener('click', function (e) {
  findinpage.activeWebview.findInPage(findinpage.input.value, {
    forward: false,
    findNext: true
  })
  findinpage.input.focus()
})

findinpage.next.addEventListener('click', function (e) {
  findinpage.activeWebview.findInPage(findinpage.input.value, {
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

    findinpage.counter.textContent = e.result.activeMatchOrdinal + ' of ' + e.result.matches + text
  }
})
