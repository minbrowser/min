var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var places = require('places/places.js')
var urlParser = require('util/urlParser.js')
var formatRelativeDate = require('util/relativeDate.js')

var bookmarkEditor = require('searchbar/bookmarkEditor.js')

function getTagText (text) {
  return text.split(/\s/g).filter(function (word) {
    return word.startsWith('#') && word.length > 1
  }).map(t => t.substring(1))
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
      if (!item.classList.contains('editing')) {
        searchbar.openURL(result.url, e)
      }
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

bangsPlugin.registerCustomBang({
  phrase: '!bookmarks',
  snippet: l('searchBookmarks'),
  isAction: false,
  showSuggestions: function (text, input, event) {
    var container = searchbarPlugins.getContainer('bangs')

    var originalText = text

    // filter out tags from the typed text
    var searchedTags = getTagText(text)
    searchedTags.forEach(function (word) {
      text = text.replace('#' + word, '')
    })
    text = text.trim()

    var displayedURLset = []
    places.searchPlaces(text, function (results) {
      searchbarPlugins.reset('bangs')

      var tagBar = document.createElement('div')
      container.appendChild(tagBar)

      places.autocompleteTags(searchedTags, function (suggestedTags) {
        searchedTags.forEach(function (tag) {
          tagBar.appendChild(bookmarkEditor.getTagElement(tag, true, function () {
            tabBar.enterEditMode(tabs.getSelected(), '!bookmarks ' + originalText.replace('#' + tag, ''))
          }))
        })
        suggestedTags.forEach(function (suggestion) {
          tagBar.appendChild(bookmarkEditor.getTagElement(suggestion, false, function () {
            tabBar.enterEditMode(tabs.getSelected(), '!bookmarks ' + originalText + ' #' + suggestion)
          }))
        })
      })

      var lastRelativeDate = '' // used to generate headings

      results
      .filter(function (result) {
        for (var i = 0; i < searchedTags.length; i++) {
          if (!result.tags.filter(t => t.startsWith(searchedTags[i])).length) {
            return false
          }
        }
        return true
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
        var item = getBookmarkListItem(result, index === 0 && text)
        container.appendChild(item)
      })

      if (searchedTags.length > 0) {
        places.getSuggestedItemsForTags(searchedTags, function (suggestedResults) {
          suggestedResults = suggestedResults.filter(res => !displayedURLset.includes(res.url))
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
    }, {
      searchBookmarks: true,
      limit: Infinity
    })
  },
  fn: function (text) {
    if (!text) {
      return
    }
    places.searchPlaces(text, function (results) {
      if (results.length !== 0) {
        results = results.sort(function (a, b) {
          return b.lastVisit - a.lastVisit
        })
        searchbar.openURL(results[0].url, null)
      }
    }, { searchBookmarks: true })
  }
})
