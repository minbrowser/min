var stringScore = require('string_score')

var searchOpenTabs = function (text, input, event, container) {
  empty(container)

  var matches = []
  var selTab = tabs.getSelected()

  tabs.get().forEach(function (item) {
    if (item.id === selTab || !item.title || item.url === 'about:blank') {
      return
    }

    var itemUrl = urlParser.removeProtocol(item.url) // don't search protocols

    var exactMatch = item.title.indexOf(text) !== -1 || itemUrl.indexOf(text) !== -1
    var fuzzyMatch = item.title.substring(0, 50).score(text, 0.5) > 0.4 || itemUrl.score(text, 0.5) > 0.4

    if (exactMatch || fuzzyMatch) {
      matches.push(item)
    }
  })

  if (matches.length === 0) {
    return
  }

  var finalMatches = matches.splice(0, 2).sort(function (a, b) {
    return b.title.score(text, 0.5) - a.title.score(text, 0.5)
  })

  finalMatches.forEach(function (tab) {
    var data = {
      icon: 'fa-external-link-square',
      title: tab.title,
      secondaryText: urlParser.removeProtocol(tab.url).replace(trailingSlashRegex, '')
    }

    var item = createSearchbarItem(data)

    item.addEventListener('click', function () {
      // if we created a new tab but are switching away from it, destroy the current (empty) tab
      var currentTabUrl = tabs.get(tabs.getSelected()).url
      if (!currentTabUrl || currentTabUrl === 'about:blank') {
        destroyTab(tabs.getSelected(), {
          switchToTab: false
        })
      }
      switchToTab(tab.id)
    })

    container.appendChild(item)
  })

  searchbarResultCount += finalMatches.length
}

registerSearchbarPlugin('openTabs', {
  index: 4,
  trigger: function (text) {
    return text.length > 2
  },
  showResults: searchOpenTabs
})
