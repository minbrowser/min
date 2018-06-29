var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var searchbarAutocomplete = require('searchbar/searchbarAutocomplete.js')

var currentResponseSent = 0

function showSearchbarPlaceResults (text, input, event, container, options) {
  var responseSent = Date.now()

  // this function is used for both regular and full-text searching, which are two separate plugins
  var pluginName = container.getAttribute('data-plugin')

  if (options && options.fullText) {
    var searchFn = bookmarks.searchPlacesFullText
  } else {
    var searchFn = bookmarks.searchPlaces
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

    results.slice(0, 4).forEach(function (result) {
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
          bookmarks.deleteHistory(result.url)
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

    searchbarPlugins.addResults(Math.min(results.length, 4)) // add the number of results that were displayed
  })
}

searchbarPlugins.register('places', {
  index: 1,
  trigger: function (text) {
    return !!text && text.indexOf('!') !== 0
  },
  showResults: throttle(showSearchbarPlaceResults, 50)
})

searchbarPlugins.register('fullTextPlaces', {
  index: 2,
  trigger: function (text) {
    return !!text && text.indexOf('!') !== 0
  },
  showResults: debounce(function () {
    if (searchbarPlugins.getResultCount() < 4 && searchbar.associatedInput) {
      showSearchbarPlaceResults.apply(this, Array.from(arguments).concat({fullText: true}))
    }
  }, 200)
})
