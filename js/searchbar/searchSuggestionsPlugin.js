var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')

var ddgAttribution = l('resultsFromDDG')

function showSearchSuggestions (text, input, event, container) {
  // TODO support search suggestions for other search engines
  if (currentSearchEngine.name !== 'DuckDuckGo') {
    return
  }

  // if the search text is a custom bang, we should never show suggestions
  if (getCustomBang(text)) {
    empty(container)
    return
  }

  if (searchbarPlugins.getResultCount() > 3) {
    empty(container)
    return
  }

  fetch('https://ac.duckduckgo.com/ac/?t=min&q=' + encodeURIComponent(text), {
    cache: 'force-cache'
  })
    .then(function (response) {
      return response.json()
    })
    .then(function (results) {
      empty(container)

      if (results) {
        results.slice(0, 3).forEach(function (result) {
          var data = {
            title: result.phrase,
            classList: ['iadata-onfocus']
          }

          if (urlParser.isURL(result.phrase) || urlParser.isURLMissingProtocol(result.phrase)) { // website suggestions
            data.icon = 'fa-globe'
          } else { // regular search results
            data.icon = 'fa-search'
          }

          var item = searchbarUtils.createItem(data)

          item.addEventListener('click', function (e) {
            searchbar.openURL(result.phrase, e)
          })

          container.appendChild(item)
        })
      }
      searchbarPlugins.addResults(results.length)
    })
}

searchbarPlugins.register('searchSuggestions', {
  index: 4,
  trigger: function (text) {
    return !!text && (text.indexOf('!') !== 0 || text.trim().indexOf(' ') !== -1) && !tabs.get(tabs.getSelected()).private
  },
  showResults: debounce(showSearchSuggestions, 150)
})
