var webviews = require('webviews.js')

var findinpage = {
  container: document.getElementById('findinpage-bar'),
  input: document.getElementById('findinpage-input'),
  counter: document.getElementById('findinpage-count'),
  previous: document.getElementById('findinpage-previous-match'),
  next: document.getElementById('findinpage-next-match'),
  endButton: document.getElementById('findinpage-end'),
  activeWebview: null,
  start: function (options) {
    webviews.releaseFocus()

    findinpage.input.placeholder = l('searchInPage')

    findinpage.activeWebview = webviews.get(tabs.getSelected())

    /* special case for PDF viewer */

    if (PDFViewer.isPDFViewer(tabs.getSelected())) {
      PDFViewer.startFindInPage(tabs.getSelected())
    }

    findinpage.counter.textContent = ''
    findinpage.container.hidden = false
    findinpage.input.focus()
    findinpage.input.select()

    if (findinpage.input.value) {
      findinpage.activeWebview.findInPage(findinpage.input.value)
    }
  },
  end: function (options) {
    options = options || {}
    var action = options.action || 'keepSelection'

    findinpage.container.hidden = true

    if (findinpage.activeWebview) {
      findinpage.activeWebview.stopFindInPage(action)

      /* special case for PDF viewer */
      if (PDFViewer.isPDFViewer(tabs.getSelected())) {
        PDFViewer.endFindInPage(tabs.getSelected())
      }

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
  if (e.keyCode === 13) { // Return/Enter key
    findinpage.activeWebview.findInPage(findinpage.input.value, {
      forward: !e.shiftKey, // find previous if Shift is pressed
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

webviews.bindEvent('found-in-page', function (webview, tabId, e, data) {
  if (data.matches !== undefined) {
    var text
    if (data.matches === 1) {
      text = l('findMatchesSingular')
    } else {
      text = l('findMatchesPlural')
    }

    findinpage.counter.textContent = text.replace('%i', data.activeMatchOrdinal).replace('%t', data.matches)
  }
})
