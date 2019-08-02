var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')

var places = require('places/places.js')

function showPlaceSuggestions (text, input, event) {
  // use the current tab's url for history suggestions, or the previous tab if the current tab is empty
  var url = tabs.get(tabs.getSelected()).url

  if (!url) {
    var previousTab = tabs.getAtIndex(tabs.getIndex(tabs.getSelected()) - 1)
    if (previousTab) {
      url = previousTab.url
    }
  }

  places.getPlaceSuggestions(url, function (results) {
    searchbarPlugins.reset('placeSuggestions')

    var tabList = tabs.get().map(function (tab) {
      return tab.url
    })

    results = results.filter(function (item) {
      return tabList.indexOf(item.url) === -1
    })

    results.slice(0, 4).forEach(function (result) {
      searchbarPlugins.addResult('placeSuggestions', {
        title: urlParser.prettyURL(result.url),
        secondaryText: searchbarUtils.getRealTitle(result.title),
        url: result.url,
        delete: function () {
          places.deleteHistory(result.url)
        }
      })
    })
  })
}

function initialize () {
  searchbarPlugins.register('placeSuggestions', {
    index: 1,
    trigger: function (text) {
      return !text
    },
    showResults: showPlaceSuggestions
  })
}

module.exports = {initialize}

