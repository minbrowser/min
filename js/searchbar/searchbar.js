var webviews = require('webviews.js')
var keybindings = require('keybindings.js')
var urlParser = require('util/urlParser.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')

function openURLInBackground (url) { // used to open a url in the background, without leaving the searchbar
  searchbar.events.emit('url-selected', {url: url, background: true})

  var i = searchbar.el.querySelector('.searchbar-item:focus')
  if (i) { // remove the highlight from an awesomebar result item, if there is one
    i.blur()
  }
}

var searchbar = {
  el: document.getElementById('searchbar'),
  associatedInput: null,
  events: new EventEmitter(),
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
      var realText = text.substring(0, searchbar.associatedInput.selectionStart) + event.key + text.substring(searchbar.associatedInput.selectionEnd, text.length)
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
      searchbar.events.emit('url-selected', {url: url, background: false})
      // focus the webview, so that autofocus inputs on the page work
      webviews.focus()
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

  // mod+enter navigates to searchbar URL + ".com"
keybindings.defineShortcut('completeSearchbar', function () {
  if (searchbar.associatedInput) { // if the searchbar is open
    var value = searchbar.associatedInput.value

      // if the text is already a URL, navigate to that page
    if (urlParser.isURLMissingProtocol(value)) {
      searchbar.events.emit('url-selected', {url: value, background: false})
    } else {
      searchbar.events.emit('url-selected', {url: urlParser.parse(value + '.com'), background: false})
    }
  }
})

searchbarPlugins.initialize(searchbar.openURL)

module.exports = searchbar
