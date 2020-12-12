const webviews = require('webviews.js')
const keybindings = require('keybindings.js')
const urlParser = require('util/urlParser.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const keyboardNavigationHelper = require('util/keyboardNavigationHelper.js')

function openURLInBackground (url) { // used to open a url in the background, without leaving the searchbar
  searchbar.events.emit('url-selected', { url: url, background: true })

  const i = searchbar.el.querySelector('.searchbar-item:focus')
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
    const text = searchbar.associatedInput.value
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
  openURL: function (url, event) {
    const hasURLHandler = searchbarPlugins.runURLHandlers(url)
    if (hasURLHandler) {
      return
    }

    if (event && event.metaKey) {
      openURLInBackground(url)
      return true
    } else {
      searchbar.events.emit('url-selected', { url: url, background: false })
      // focus the webview, so that autofocus inputs on the page work
      webviews.focus()
      return false
    }
  }
}

keyboardNavigationHelper.addToGroup('searchbar', searchbar.el)

// mod+enter navigates to searchbar URL + ".com"
keybindings.defineShortcut('completeSearchbar', function () {
  if (searchbar.associatedInput) { // if the searchbar is open
    const value = searchbar.associatedInput.value

    // if the text is already a URL, navigate to that page
    if (urlParser.isURLMissingProtocol(value)) {
      searchbar.events.emit('url-selected', { url: value, background: false })
    } else {
      searchbar.events.emit('url-selected', { url: urlParser.parse(value + '.com'), background: false })
    }
  }
})

searchbarPlugins.initialize(searchbar.openURL)

module.exports = searchbar
