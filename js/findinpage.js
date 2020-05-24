var webviews = require('webviews.js')
var keybindings = require('keybindings.js')
var PDFViewer = require('pdfViewer.js')

var findinpage = {
  container: document.getElementById('findinpage-bar'),
  input: document.getElementById('findinpage-input'),
  counter: document.getElementById('findinpage-count'),
  previous: document.getElementById('findinpage-previous-match'),
  next: document.getElementById('findinpage-next-match'),
  endButton: document.getElementById('findinpage-end'),
  activeTab: null,
  start: function (options) {
    webviews.releaseFocus()

    findinpage.input.placeholder = l('searchInPage')

    findinpage.activeTab = tabs.getSelected()

    /* special case for PDF viewer */

    if (PDFViewer.isPDFViewer(findinpage.activeTab)) {
      PDFViewer.startFindInPage(findinpage.activeTab)
    }

    findinpage.counter.textContent = ''
    findinpage.container.hidden = false
    findinpage.input.focus()
    findinpage.input.select()

    if (findinpage.input.value) {
      webviews.callAsync(findinpage.activeTab, 'findInPage', findinpage.input.value)
    }
  },
  end: function (options) {
    options = options || {}
    var action = options.action || 'keepSelection'

    findinpage.container.hidden = true

    if (findinpage.activeTab) {
      webviews.callAsync(findinpage.activeTab, 'stopFindInPage', action)

      /* special case for PDF viewer */
      if (tabs.get(findinpage.activeTab) && PDFViewer.isPDFViewer(findinpage.activeTab)) {
        PDFViewer.endFindInPage(findinpage.activeTab)
      }

      webviews.callAsync(findinpage.activeTab, 'focus')
    }

    findinpage.activeTab = null
  }
}

findinpage.input.addEventListener('click', function () {
  webviews.releaseFocus()
})

findinpage.endButton.addEventListener('click', function () {
  findinpage.end()
})

findinpage.input.addEventListener('input', function (e) {
  if (this.value) {
    webviews.callAsync(findinpage.activeTab, 'findInPage', findinpage.input.value)
  }
})

findinpage.input.addEventListener('keypress', function (e) {
  if (e.keyCode === 13) { // Return/Enter key
    webviews.callAsync(findinpage.activeTab, 'findInPage', [findinpage.input.value, {
      forward: !e.shiftKey, // find previous if Shift is pressed
      findNext: true
    }])
  }
})

findinpage.previous.addEventListener('click', function (e) {
  webviews.callAsync(findinpage.activeTab, 'findInPage', [findinpage.input.value, {
    forward: false,
    findNext: true
  }])
  findinpage.input.focus()
})

findinpage.next.addEventListener('click', function (e) {
  webviews.callAsync(findinpage.activeTab, 'findInPage', [findinpage.input.value, {
    forward: true,
    findNext: true
  }])
  findinpage.input.focus()
})

webviews.bindEvent('view-hidden', function (tabId) {
  if (tabId === findinpage.activeTab) {
    findinpage.end()
  }
})

webviews.bindEvent('did-start-loading', function (tabId) {
  if (tabId === findinpage.activeTab) {
    findinpage.end()
  }
})

webviews.bindEvent('found-in-page', function (tabId, data) {
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

keybindings.defineShortcut('followLink', function () {
  findinpage.end({ action: 'activateSelection' })
})

keybindings.defineShortcut({ keys: 'esc' }, function (e) {
  findinpage.end()
})

module.exports = findinpage
