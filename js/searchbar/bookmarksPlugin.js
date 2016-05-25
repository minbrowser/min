function getBookmarkItem (result) {
  // create the basic item
  // getRealTitle is defined in searchbar.js

  var item = createSearchbarItem({
    icon: 'fa-star',
    title: getRealTitle(result.title),
    secondaryText: urlParser.prettyURL(result.url),
    url: result.url
  })

  if (result.extraData && result.extraData.metadata) {
    var secondaryText = item.querySelector('.secondary-text')

    for (var md in result.extraData.metadata) {
      var span = document.createElement('span')

      span.className = 'md-info'
      span.textContent = result.extraData.metadata[md]

      secondaryText.insertBefore(span, secondaryText.firstChild)
    }
  }

  return item
}

function showBookmarkResults (text, input, event, container) {
  bookmarks.searchBookmarks(text, function (results) {
    empty(container)

    var resultsShown = 1
    results.splice(0, 2).forEach(function (result) {
      // as more results are added, the threshold for adding another one gets higher
      if ((result.score > Math.max(0.0004, 0.0016 - (0.00012 * Math.pow(1.3, text.length))) || text.length > 25) && (resultsShown === 1 || text.length > 6)) {
        container.appendChild(getBookmarkItem(result))
        resultsShown++
      }
    })
  })
}

registerSearchbarPlugin('bookmarks', {
  index: 3,
  trigger: function (text) {
    return text.length > 4
  },
  showResults: debounce(showBookmarkResults, 200)
})

function showAllBookmarks () {
  bookmarks.searchBookmarks('', function (results) {
    results.sort(function (a, b) {
      // http://stackoverflow.com/questions/6712034/sort-array-by-firstname-alphabetically-in-javascript
      if (a.url < b.url) return -1
      if (a.url > b.url) return 1
      return 0
    })

    var container = getSearchbarContainer('bookmarks')

    results.forEach(function (result) {
      container.appendChild(getBookmarkItem(result))
    })
  })
}
