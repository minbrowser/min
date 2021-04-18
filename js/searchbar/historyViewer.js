var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var bangsPlugin = require('searchbar/bangsPlugin.js')
var places = require('places/places.js')
var urlParser = require('util/urlParser.js')
var formatRelativeDate = require('util/relativeDate.js')

module.exports = {
  initialize: function () {
    bangsPlugin.registerCustomBang({
      phrase: '!history',
      snippet: l('searchHistory'),
      isAction: false,
      showSuggestions: function (text, input, event) {
        places.searchPlaces(text, function (results) {
          searchbarPlugins.reset('bangs')

          var container = searchbarPlugins.getContainer('bangs')
          var lazyList = searchbarUtils.createLazyList(container.parentNode)

          var lastRelativeDate = '' // used to generate headings

          results.sort(function (a, b) {
            // order by last visit
            return b.lastVisit - a.lastVisit
          }).slice(0, 1000).forEach(function (result, index) {
            var thisRelativeDate = formatRelativeDate(result.lastVisit)
            if (thisRelativeDate !== lastRelativeDate) {
              searchbarPlugins.addHeading('bangs', { text: thisRelativeDate })
              lastRelativeDate = thisRelativeDate
            }
            var data = {
              title: result.title,
              secondaryText: urlParser.getSourceURL(result.url),
              fakeFocus: index === 0 && text,
              click: function (e) {
                searchbar.openURL(result.url, e)
              },
              delete: function () {
                places.deleteHistory(result.url)
              },
              showDeleteButton: true
            }
            var placeholder = lazyList.createPlaceholder()
            container.appendChild(placeholder)
            lazyList.lazyRenderItem(placeholder, data)
          })
        }, { limit: Infinity })
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
        }, { limit: Infinity })
      }
    })
  }
}
