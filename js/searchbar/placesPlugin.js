var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var searchbarAutocomplete = require('searchbar/searchbarAutocomplete.js')
var urlParser = require('util/urlParser.js')

var places = require('places/places.js')

var currentResponseSent = 0

var previousPlacesResults = {} // used to avoid duplicating results between places and fullTextPlaces

function showSearchbarPlaceResults (text, input, event, container, pluginName = 'places') {
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

    // remove a previous top answer

    var placesTopAnswer = searchbarPlugins.getTopAnswer(pluginName)

    if (placesTopAnswer && !hasAutocompleted) {
      placesTopAnswer.remove()
    }

    // clear previous results
    empty(container)

    if (pluginName === 'fullTextPlaces') {
      // avoid showing results that are already being shown by the regular places plugin
      // this assumes that places runs before fullTextPlaces
      if (previousPlacesResults.text === text) {
        results = results.filter(r => previousPlacesResults.results.indexOf(r.url) === -1)
      }
    }

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

          searchbarPlugins.setTopAnswer(pluginName, searchbarUtils.createItem({
            title: domain,
            url: domain,
            classList: ['fakefocus']
          }))
        }
      }

      var data = {
        title: urlParser.prettyURL(result.url),
        secondaryText: searchbarUtils.getRealTitle(result.title),
        url: result.url,
        delete: function () {
          places.deleteHistory(result.url)
        }
      }

      // show a star for bookmarked items
      if (result.isBookmarked) {
        data.icon = 'fa-star'
      }

      // show the metadata for the item

      if (result.metadata) {
        data.metadata = []

        for (var md in result.metadata) {
          data.metadata.push(result.metadata[md])
        }
      }

      // create the item

      var item = searchbarUtils.createItem(data)

      if (autocompletionType === 1) { // if this exact URL was autocompleted, show the item as the top answer
        item.classList.add('fakefocus')
        searchbarPlugins.setTopAnswer(pluginName, item)
      } else {
        container.appendChild(item)
      }
    })

    searchbarPlugins.addResults(pluginName, results.length)
    if (pluginName === 'places') {
      previousPlacesResults = {text, results: results.map(r => r.url)}
    }
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
      empty(arguments[3])
    }
  }, 200)
})
