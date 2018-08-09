var browserUI = require('api-wrapper.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')

function openURLInBackground (url) { // used to open a url in the background, without leaving the searchbar
  var newTab = tabs.add({
    url: url,
    private: tabs.get(tabs.getSelected()).private
  }, tabs.getIndex(tabs.getSelected()) + 1)
  browserUI.addTab(newTab, {
    enterEditMode: false,
    openInBackground: true
  })

  var i = searchbar.el.querySelector('.searchbar-item:focus')
  if (i) { // remove the highlight from an awesomebar result item, if there is one
    i.blur()
  }
}

var searchbar = {
  el: document.getElementById('searchbar'),
  associatedInput: null,
  show: function (associatedInput) {
    searchbar.el.hidden = false
    searchbar.associatedInput = associatedInput
  },
  hide: function () {
    searchbar.associatedInput = null
    searchbar.el.hidden = true

    searchbarPlugins.clearAll()
  },
  getValue: function () {
    var text = searchbar.associatedInput.value
    return text.replace(text.substring(searchbar.associatedInput.selectionStart, searchbar.associatedInput.selectionEnd), '')
  },
  showResults: function (text, event) {
    // find the real input value, accounting for highlighted suggestions and the key that was just pressed
    // delete key doesn't behave like the others, String.fromCharCode returns an unprintable character (which has a length of one)

    if (event && event.keyCode !== 8) {
      var realText = text.substring(0, searchbar.associatedInput.selectionStart) + String.fromCharCode(event.keyCode) + text.substring(searchbar.associatedInput.selectionEnd, text.length)
    } else {
      var realText = text
    }

    searchbarPlugins.run(realText, searchbar.associatedInput, event)
  },
  focusItem: function (options) {
    options = options || {} // fallback if options is null
    var previous = options.focusPrevious

    var allItems = [].slice.call(searchbar.el.querySelectorAll('.searchbar-item:not(.unfocusable)'))
    var currentItem = searchbar.el.querySelector('.searchbar-item:focus, .searchbar-item.fakefocus')

    var index = allItems.indexOf(currentItem)
    var logicalNextItem = allItems[(previous) ? index - 1 : index + 1]

    // clear previously focused items
    var fakefocus = searchbar.el.querySelector('.fakefocus')
    if (fakefocus) {
      fakefocus.classList.remove('fakefocus')
    }

    if (currentItem && logicalNextItem) { // an item is focused and there is another item after it, move onto the next one
      logicalNextItem.focus()
    } else if (currentItem) { // the last item is focused, focus the searchbar again
      searchbar.associatedInput.focus()
      return
    } else if (allItems[0]) { // no item is focused.
      allItems[0].focus()
    }

    var focusedItem = logicalNextItem || allItems[0]

    if (focusedItem && focusedItem.classList.contains('iadata-onfocus')) {
      setTimeout(function () {
        if (document.activeElement === focusedItem) {
          var itext = focusedItem.querySelector('.title').textContent

          showSearchbarInstantAnswers(itext, searchbar.associatedInput, null, searchbarPlugins.getContainer('instantAnswers'))
        }
      }, 300)
    }
  },
  openURL: function (url, event) {
    var hasURLHandler = searchbarPlugins.runURLHandlers(url)
    if (hasURLHandler) {
      return
    }

    if (event && event.metaKey) {
      openURLInBackground(url)
      return true
    } else {
      browserUI.navigate(tabs.getSelected(), url)
      // focus the webview, so that autofocus inputs on the page work
      webviews.focus(tabs.getSelected())
      return false
    }
  }
}

// return key on result items should trigger click
// tab key or arrowdown key should focus next item
// arrowup key should focus previous item

searchbar.el.addEventListener('keydown', function (e) {
  if (e.keyCode === 13) {
    e.target.click()
  } else if (e.keyCode === 9 || e.keyCode === 40) { // tab or arrowdown key
    e.preventDefault()
    searchbar.focusItem()
  } else if (e.keyCode === 38) {
    e.preventDefault()
    searchbar.focusItem({
      focusPrevious: true
    })
  }
})

module.exports = searchbar
