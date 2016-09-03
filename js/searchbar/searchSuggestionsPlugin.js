var ddgAttribution = 'Results from DuckDuckGo'

function showSearchSuggestions (text, input, event, container) {
  // TODO support search suggestions for other search engines
  if (currentSearchEngine.name !== 'DuckDuckGo') {
    return
  }

  if (searchbarResultCount > 3) {
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
            title: result.phrase
          }

          if (urlParser.isURL(result.phrase) || urlParser.isURLMissingProtocol(result.phrase)) { // website suggestions
            data.icon = 'fa-globe'
          } else { // regular search results
            data.icon = 'fa-search'
          }

          var item = createSearchbarItem(data)

          item.addEventListener('click', function (e) {
            openURLFromsearchbar(e, result.phrase)
          })

          container.appendChild(item)
        })
      }
      searchbarResultCount += results.length
    })
}

registerSearchbarPlugin('searchSuggestions', {
  index: 4,
  trigger: function (text) {
    return !!text && !(text.indexOf('!') === 0 && text.indexOf(' ') === -1) && !tabs.get(tabs.getSelected()).private
  },
  showResults: debounce(showSearchSuggestions, 200)
})
