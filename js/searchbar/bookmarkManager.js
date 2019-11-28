var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var places = require('places/places.js')
var urlParser = require('util/urlParser.js')
var formatRelativeDate = require('util/relativeDate.js')

var bookmarkEditor = require('searchbar/bookmarkEditor.js')

function parseBookmarkSearch (text) {
  var tags = text.split(/\s/g).filter(function (word) {
    return word.startsWith('#') && word.length > 1
  }).map(t => t.substring(1))

  var newText = text
  tags.forEach(function (word) {
    newText = newText.replace('#' + word, '')
  })
  newText = newText.trim()
  return {
    tags,
    text: newText
  }
}

function itemMatchesTags (item, tags) {
  for (var i = 0; i < tags.length; i++) {
    if (!item.tags.filter(t => t.startsWith(tags[i])).length) {
      return false
    }
  }
  return true
}

function showBookmarkEditor (url, item) {
  bookmarkEditor.show(url, item, function (newBookmark) {
    if (newBookmark) {
      item.parentNode.replaceChild(getBookmarkListItem(newBookmark), item)
    } else {
      places.deleteHistory(url)
      item.remove()
    }
  })
}

function getBookmarkListItem (result, focus) {
  var item = searchbarUtils.createItem({
    title: result.title,
    icon: 'fa-star',
    secondaryText: urlParser.getSourceURL(result.url),
    fakeFocus: focus,
    click: function (e) {
      searchbar.openURL(result.url, e)
    },
    classList: ['bookmark-item'],
    delete: function () {
      places.deleteHistory(result.url)
    },
    button: {
      icon: 'fa-pencil',
      fn: function (el) {
        showBookmarkEditor(result.url, item)
      }
    }
  })
  return item
}

function showBookmarks (text, input, event) {
  var container = searchbarPlugins.getContainer('bangs')

  var parsedText = parseBookmarkSearch(text)

  var displayedURLset = []
  var hiddenURLSet = []
  places.searchPlaces(parsedText.text, function (results) {
    places.autocompleteTags(parsedText.tags, function (suggestedTags) {
      searchbarPlugins.reset('bangs')

      var tagBar = document.createElement('div')
      container.appendChild(tagBar)

      parsedText.tags.forEach(function (tag) {
        tagBar.appendChild(bookmarkEditor.getTagElement(tag, true, function () {
          tabBar.enterEditMode(tabs.getSelected(), '!bookmarks ' + text.replace('#' + tag, '').trim())
        }, {autoRemove: false}))
      })
      // it doesn't make sense to display tag suggestions if there's a search, since the suggestions are generated without taking the search into account
      if (!parsedText.text) {
        suggestedTags.slice(0, 12).forEach(function (suggestion) {
          tagBar.appendChild(bookmarkEditor.getTagElement(suggestion, false, function () {
            var needsSpace = text.slice(-1) !== ' ' && text.slice(-1) !== ''
            tabBar.enterEditMode(tabs.getSelected(), '!bookmarks ' + text + (needsSpace ? ' #' : '#') + suggestion + ' ')
          }))
        })
      }

      var lastRelativeDate = '' // used to generate headings

      results
    .filter(function (result) {
      if (itemMatchesTags(result, parsedText.tags)) {
        return true
      } else {
        hiddenURLSet.push(result.url)
        return false
      }
    })
    .sort(function (a, b) {
      // order by last visit
      return b.lastVisit - a.lastVisit
    })
    .slice(0, 100)
    .forEach(function (result, index) {
      displayedURLset.push(result.url)

      var thisRelativeDate = formatRelativeDate(result.lastVisit)
      if (thisRelativeDate !== lastRelativeDate) {
        searchbarPlugins.addHeading('bangs', { text: thisRelativeDate })
        lastRelativeDate = thisRelativeDate
      }
      var item = getBookmarkListItem(result, index === 0 && parsedText.text)
      container.appendChild(item)
    })

      if (parsedText.tags.length > 0) {
        places.getSuggestedItemsForTags(parsedText.tags, function (suggestedResults) {
          suggestedResults = suggestedResults.filter(res => hiddenURLSet.includes(res.url))
          if (suggestedResults.length === 0) {
            return
          }
          searchbarPlugins.addHeading('bangs', { text: 'Similar items' })
          suggestedResults.sort(function (a, b) {
        // order by last visit
            return b.lastVisit - a.lastVisit
          }).forEach(function (result, index) {
            var item = getBookmarkListItem(result, false)
            container.appendChild(item)
          })
        })
      }
    })
  }, {
    searchBookmarks: true,
    limit: Infinity
  })
}

bangsPlugin.registerCustomBang({
  phrase: '!bookmarks',
  snippet: l('searchBookmarks'),
  isAction: false,
  showSuggestions: showBookmarks,
  fn: function (text) {
    var parsedText = parseBookmarkSearch(text)
    if (!parsedText.text) {
      return
    }
    places.searchPlaces(parsedText.text, function (results) {
      results = results
        .filter(r => itemMatchesTags(r, parsedText.tags))
        .sort(function (a, b) {
          return b.lastVisit - a.lastVisit
        })
      if (results.length !== 0) {
        searchbar.openURL(results[0].url, null)
      }
    }, { searchBookmarks: true })
  }
})
