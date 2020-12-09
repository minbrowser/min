const searchbar = require('searchbar/searchbar.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const searchbarUtils = require('searchbar/searchbarUtils.js')
const searchbarAutocomplete = require('util/autocomplete.js')
const urlParser = require('util/urlParser.js')
const readerDecision = require('readerDecision.js')

const places = require('places/places.js')
const searchEngine = require('util/searchEngine.js')

let currentResponseSent = 0

function showSearchbarPlaceResults (text, input, event, pluginName = 'places') {
  const responseSent = Date.now()

  if (pluginName === 'fullTextPlaces') {
    var searchFn = places.searchPlacesFullText
    var resultCount = 4 - searchbarPlugins.getResultCount('places')
  } else {
    var searchFn = places.searchPlaces
    var resultCount = 4
  }

  // only autocomplete an item if the delete key wasn't pressed
  let canAutocomplete = event && event.keyCode !== 8

  searchFn(text, function (results) {
    // prevent responses from returning out of order
    if (responseSent < currentResponseSent) {
      return
    }

    currentResponseSent = responseSent

    searchbarPlugins.reset(pluginName)

    results = results.slice(0, resultCount)

    results.forEach(function (result, index) {
      let didAutocompleteResult = false

      const searchQuery = searchEngine.getSearch(result.url)

      if (canAutocomplete) {
        // if the query is autocompleted, pressing enter will search for the result using the current search engine, so only pages from the current engine should be autocompleted
        if (searchQuery && searchQuery.engine === searchEngine.getCurrent().name && index === 0) {
          const acResult = searchbarAutocomplete.autocomplete(input, [searchQuery.search])
          if (acResult.valid) {
            canAutocomplete = false
            didAutocompleteResult = true
          }
        } else {
          const autocompletionType = searchbarAutocomplete.autocompleteURL(input, result.url)

          if (autocompletionType !== -1) {
            canAutocomplete = false
          }

          if (autocompletionType === 0) { // the domain was autocompleted, show a domain result item
            const domain = new URL(result.url).hostname

            searchbarPlugins.setTopAnswer(pluginName, {
              title: domain,
              url: domain,
              fakeFocus: true
            })
          }
          if (autocompletionType === 1) {
            didAutocompleteResult = true
          }
        }
      }

      const data = {
        url: result.url,
        metadata: result.tags,
        delete: function () {
          places.deleteHistory(result.url)
        }
      }

      if (searchQuery) {
        data.title = searchQuery.search
        data.secondaryText = searchQuery.engine
        data.icon = 'carbon:search'
      } else {
        data.title = urlParser.prettyURL(urlParser.getSourceURL(result.url))
        data.secondaryText = searchbarUtils.getRealTitle(result.title)
      }

      // show a star for bookmarked items
      if (result.isBookmarked) {
        data.icon = 'carbon:star-filled'
      } else if (readerDecision.shouldRedirect(result.url) === 1) {
        // show an icon to indicate that this page will open in reader view
        data.icon = 'carbon:notebook'
      }

      // create the item

      if (didAutocompleteResult) { // if this exact URL was autocompleted, show the item as the top answer
        data.fakeFocus = true
        searchbarPlugins.setTopAnswer(pluginName, data)
      } else {
        searchbarPlugins.addResult(pluginName, data)
      }
    })
  })
}

function initialize () {
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
}

module.exports = { initialize }
