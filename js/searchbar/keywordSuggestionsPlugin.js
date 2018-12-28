var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')

// when we get keywords data from the page, show those results in the searchbar

webviews.bindIPC('keywordsData', function (webview, tabId, args) {
  var container = searchbarPlugins.getContainer('keywordSuggestions')

  empty(container)

  args[0].entities.slice(0, 5).forEach(function (item) {
    var div = searchbarUtils.createItem({
      icon: 'fa-search',
      title: item,
      url: item
    })

    container.appendChild(div)
  })
})

searchbarPlugins.register('keywordSuggestions', {
  index: 10,
  trigger: function (text) {
    return !text
  },
  showResults: function () {
    // request keyword suggestions, which will be displayed later
    webviews.callAsync(tabs.getSelected(), 'send', 'getKeywordsData')
  }
})
