var webviews = require('webviews.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')

// when we get keywords data from the page, show those results in the searchbar

webviews.bindIPC('keywordsData', function (webview, tabId, args) {
  searchbarPlugins.reset('keywordSuggestions')

  if (tabs.get(tabs.getSelected()).url) {
    var entities = args[0].entities.slice(0, 5)
  } else {
    var entities = args[0].entities.slice(0, 2)
  }

  entities.forEach(function (item) {
    searchbarPlugins.addResult('keywordSuggestions', {
      icon: 'fa-search',
      title: item,
      url: item
    })
  })
})

function initialize () {
  searchbarPlugins.register('keywordSuggestions', {
    index: 10,
    trigger: function (text) {
      return !text
    },
    showResults: function () {
      // request keyword suggestions, which will be displayed later

      if (tabs.get(tabs.getSelected()).url) {
        var sourceTab = tabs.get(tabs.getSelected())
      } else {
        // if this is a new tab, show suggestions from the previous tab
        var sourceTab = tabs.getAtIndex(tabs.getIndex(tabs.getSelected()) - 1)
      }
      if (sourceTab) {
        webviews.callAsync(sourceTab.id, 'send', 'getKeywordsData')
      }
    }
  })
}

module.exports = {initialize}
