const searchbar = require('searchbar/searchbar.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')

const shortcuts = [
  {
    icon: 'recently-viewed',
    text: '!history '
  },
  {
    icon: 'star',
    text: '!bookmarks '
  },
  {
    icon: 'overflow-menu-horizontal',
    text: '!'
  }
]

function showShortcutButtons (text, input, event) {
  var container = searchbarPlugins.getContainer('shortcutButtons')

  searchbarPlugins.reset('shortcutButtons')

  shortcuts.forEach(function (shortcut) {
    var el = document.createElement('button')
    el.className = 'searchbar-shortcut i carbon:' + shortcut.icon
    el.title = shortcut.text
    el.tabIndex = -1
    el.addEventListener('click', function () {
      input.value = shortcut.text
      input.focus()
      searchbar.showResults(shortcut.text)
    })

    container.appendChild(el)
  })
}

function initialize () {
  searchbarPlugins.register('shortcutButtons', {
    index: 10,
    trigger: function (text) {
      return !text
    },
    showResults: showShortcutButtons
  })
}

module.exports = { initialize }
