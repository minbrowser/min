var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var searchbarAutocomplete = require('searchbar/searchbarAutocomplete.js')
var urlParser = require('util/urlParser.js')
var readerDecision = require('readerDecision.js')

/* For survey */
var browserUI = require('browserUI.js')

var surveyURL
fetch('https://minbrowser.github.io/min/searchSurvey/searchSurvey.json').then(function (response) {
  return response.json()
}).then(function (data) {
  if (data.available && data.url) {
    surveyURL = data.url
  }
})

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

  // only autocomplete an item if the delete key wasn't pressed
  var canAutocomplete = event && event.keyCode !== 8

  searchFn(text, function (results) {
    // prevent responses from returning out of order
    if (responseSent < currentResponseSent) {
      return
    }

    currentResponseSent = responseSent

    searchbarPlugins.reset(pluginName)

    results = results.slice(0, resultCount)

    results.forEach(function (result, index) {
      var didAutocompleteResult = false

      var searchQuery
      if (searchEngine.isSearchURL(result.url)) {
        searchQuery = searchEngine.getSearch(result.url)
      }

      if (canAutocomplete) {
        if (searchQuery && index === 0) {
          var acResult = searchbarAutocomplete.autocomplete(input, [searchQuery.search])
          if (acResult.valid) {
            canAutocomplete = false
            didAutocompleteResult = true
          }
        } else {
          var autocompletionType = searchbarAutocomplete.autocompleteURL(input, result)

          if (autocompletionType !== -1) {
            canAutocomplete = false
          }

          if (autocompletionType === 0) { // the domain was autocompleted, show a domain result item
            var domain = new URL(result.url).hostname

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

      var data = {
        url: result.url,
        metadata: result.tags,
        delete: function () {
          places.deleteHistory(result.url)
        }
      }

      if (searchQuery) {
        data.title = searchQuery.search
        data.secondaryText = searchQuery.engine
        data.icon = 'fa-search'
      } else {
        data.title = urlParser.prettyURL(urlParser.getSourceURL(result.url))
        data.secondaryText = searchbarUtils.getRealTitle(result.title)
      }

      // show a star for bookmarked items
      if (result.isBookmarked) {
        data.icon = 'fa-star'
      } else if (readerDecision.shouldRedirect(result.url) === 1) {
        // show an icon to indicate that this page will open in reader view
        data.icon = 'fa-align-left'
      }

      // create the item

      if (didAutocompleteResult) { // if this exact URL was autocompleted, show the item as the top answer
        data.fakeFocus = true
        searchbarPlugins.setTopAnswer(pluginName, data)
      } else {
        searchbarPlugins.addResult(pluginName, data)
      }
    })

    if (surveyURL && pluginName === 'fullTextPlaces') {
      var feedbackLink = document.createElement('span')
      feedbackLink.className = 'search-feedback-link'
      feedbackLink.textContent = 'Search Feedback'
      feedbackLink.addEventListener('click', function (e) {
        var url = surveyURL + '?query=' + encodeURIComponent(text) + '&results=' + encodeURIComponent(results.map(r => r.url).join('\n')) + '&version=' + encodeURIComponent(window.globalArgs['app-version'])
        browserUI.addTab(tabs.add({url: url}), {enterEditMode: false})
      })
      searchbarPlugins.getContainer('fullTextPlaces').appendChild(feedbackLink)
    }
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

module.exports = {initialize}
