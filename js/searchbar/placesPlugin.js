var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var searchbarAutocomplete = require('searchbar/searchbarAutocomplete.js')
var urlParser = require('util/urlParser.js')

var places = require('places/places.js')
var searchEngine = require('util/searchEngine.js')

var currentResponseSent = 0

function showSearchbarPlaceResults (text, input, event, pluginName = 'places') {
  var responseSent = Date.now()

  if (pluginName === 'fullTextPlaces') {
    var searchFn = places.searchPlacesFullText
    var resultCount = 4 - searchbarPlugins.getResultCount('places')
  } else {
    var searchFn = places.searchPlaces
    var resultCount = 4
  }

  var hasAutocompleted = false

  searchFn(text, function (results) {

    // prevent responses from returning out of order
    if (responseSent < currentResponseSent) {
      return
    }

    currentResponseSent = responseSent

    searchbarPlugins.reset(pluginName)

    results = results.slice(0, resultCount)

    results.forEach(function (result) {
      // only autocomplete an item if the delete key wasn't pressed, and nothing has been autocompleted already
      if (event && event.keyCode !== 8 && !hasAutocompleted) {
        var autocompletionType = searchbarAutocomplete.autocompleteURL(result, input)

        if (autocompletionType !== -1) {
          hasAutocompleted = true
        }

        if (autocompletionType === 0) { // the domain was autocompleted, show a domain result item
          var domain = new URL(result.url).hostname

          searchbarPlugins.setTopAnswer(pluginName, {
            title: domain,
            url: domain,
            fakeFocus: true
          })
        }
      }

      var data = {
        url: result.url,
        delete: function () {
          places.deleteHistory(result.url)
        }
      }

      if (searchEngine.isSearchURL(result.url)) {
        var query = searchEngine.getSearch(result.url)
        data.title = query.search
        data.secondaryText = query.engine
        data.icon = 'fa-search'
      } else {
        data.title = urlParser.prettyURL(urlParser.getSourceURL(result.url))
        data.secondaryText = searchbarUtils.getRealTitle(result.title)
      }

      // show a star for bookmarked items
      if (result.isBookmarked) {
        data.icon = 'fa-star'
      } else if (result.url.startsWith(readerView.readerURL)) {
        // show an icon to indicate that this page will open in reader view
        data.icon = 'fa-align-left'
      }

      // show the metadata for the item

      if (result.metadata) {
        data.metadata = []

        for (var md in result.metadata) {
          data.metadata.push(result.metadata[md])
        }
      }

      if (autocompletionType === 1) {
        data.fakeFocus = true
      }

      // create the item

      if (autocompletionType === 1) { // if this exact URL was autocompleted, show the item as the top answer
        searchbarPlugins.setTopAnswer(pluginName, data)
      } else {
        searchbarPlugins.addResult(pluginName, data)
      }
    })
  })
}

searchbarPlugins.register('places', {
  index: 1,
  trigger: function (text) {
    return !!text && text.indexOf('!') !== 0
  },
  showResults: showSearchbarPlaceResults
})

searchbarPlugins.register('fullTextPlaces', {
  index: 2,
  trigger: function (text) {
    return !!text && text.indexOf('!') !== 0
  },
  showResults: debounce(function () {
    if (searchbarPlugins.getResultCount('places') < 4 && searchbar.associatedInput) {
      showSearchbarPlaceResults.apply(this, Array.from(arguments).concat('fullTextPlaces'))
    } else {
      // can't show results, clear any previous ones
      searchbarPlugins.reset('fullTextPlaces')
    }
  }, 200)
})
