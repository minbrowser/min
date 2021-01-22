const searchbar = require('searchbar/searchbar.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const searchbarUtils = require('searchbar/searchbarUtils.js')
const bangsPlugin = require('searchbar/bangsPlugin.js')
const places = require('places/places.js')
const urlParser = require('util/urlParser.js')
const formatRelativeDate = require('util/relativeDate.js')

module.exports = {
  initialize: function () {
    bangsPlugin.registerCustomBang({
      phrase: '!history',
      snippet: l('searchHistory'),
      isAction: false,
      showSuggestions: function (text, input, event) {
        places.searchPlaces(text, function (results) {
          searchbarPlugins.reset('bangs')

          const container = searchbarPlugins.getContainer('bangs')
          const lazyList = searchbarUtils.createLazyList(container.parentNode)

          let lastRelativeDate = '' // used to generate headings

          results.sort(function (a, b) {
            // order by last visit
            return b.lastVisit - a.lastVisit
          }).slice(0, 1000).forEach(function (result, index) {
            const thisRelativeDate = formatRelativeDate(result.lastVisit)
            if (thisRelativeDate !== lastRelativeDate) {
              searchbarPlugins.addHeading('bangs', { text: thisRelativeDate })
              lastRelativeDate = thisRelativeDate
            }
            const data = {
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
            const placeholder = lazyList.createPlaceholder()
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
