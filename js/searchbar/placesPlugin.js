var currentResponseSent = 0

function showSearchbarPlaceResults (text, input, event, container) {
  var responseSent = Date.now()

  bookmarks.searchPlaces(text, function (results) {

    // prevent responses from returning out of order
    if (responseSent < currentResponseSent) {
      return
    }

    currentResponseSent = responseSent

    // remove a previous top answer

    var placesTopAnswer = getTopAnswer('places')

    if (placesTopAnswer && !hasAutocompleted) {
      placesTopAnswer.remove()
    }

    // clear previous results
    empty(container)

    results.slice(0, 4).forEach(function (result) {
      // only autocomplete an item if the delete key wasn't pressed, and nothing has been autocompleted already
      if (event.keyCode !== 8 && !hasAutocompleted) {
        var autocompletionType = autocompleteURL(result, input)

        if (autocompletionType !== -1) {
          hasAutocompleted = true
        }

        if (autocompletionType === 0) { // the domain was autocompleted, show a domain result item
          var domain = new URL(result.url).hostname

          setTopAnswer('places', createSearchbarItem({
            title: domain,
            url: domain,
            classList: ['fakefocus']
          }))
        }
      }

      var data = {
        title: urlParser.prettyURL(result.url),
        secondaryText: getRealTitle(result.title),
        url: result.url,
        delete: function () {
          bookmarks.deleteHistory(result.url)
        }
      }

      // show a star for bookmarked items
      if (result.isBookmarked) {
        data.icon = 'fa-star'
      }

      // create the item

      var item = createSearchbarItem(data)

      // show the metadata for the item

      if (result.metadata) {
        var secondaryText = item.querySelector('.secondary-text')

        for (var md in result.metadata) {
          var span = document.createElement('span')

          span.className = 'md-info'
          span.textContent = result.metadata[md]

          secondaryText.insertBefore(span, secondaryText.firstChild)
        }
      }

      if (autocompletionType === 1) { // if this exact URL was autocompleted, show the item as the top answer
        item.classList.add('fakefocus')
        setTopAnswer('places', item)
      } else {
        container.appendChild(item)
      }
    })

    searchbarResultCount += Math.min(results.length, 4) // add the number of results that were displayed
  })
}

registerSearchbarPlugin('places', {
  index: 1,
  trigger: function (text) {
    return !!text && text.indexOf('!') !== 0
  },
  showResults: throttle(showSearchbarPlaceResults, 50)
})
