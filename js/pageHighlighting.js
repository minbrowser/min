const webviews = require('webviews.js')
const places = require('places/places.js')
const db = require('util/database.js').db
const urlParser = require('util/urlParser.js')

const pageHighlighting = {
  createHighlight: function () {
    webviews.callAsync(tabs.getSelected(), 'send', ['createHighlight'])
  },
  onPageLoad: function (tabId) {
    console.log(tabId, tabs.get(tabId).url)
    db.places.where('url').equals(urlParser.getSourceURL(tabs.get(tabId).url)).first(function (page) {
      console.log(page)
      if (page?.annotations) {
        webviews.callAsync(tabId, 'send', ['setAnnotations', page.annotations])
      }
    })
  },
  initialize: function () {
    webviews.bindIPC('saveHighlight', function (tabId, args) {
      if (args[0].status !== 0) {
        console.warn(args[0])
        return
      }

      db.places.where('url').equals(urlParser.getSourceURL(tabs.get(tabs.getSelected()).url)).first(function (page) {
        const annotations = (page?.annotations) || []

        annotations.push({
          type: 'highlight',
          createdAt: Date.now(),
          item: args[0].fragment
        })

        places.updateItem(page.url, { annotations: annotations }, () => {})
      })
    })

    webviews.bindEvent('did-finish-load', pageHighlighting.onPageLoad)
  }
}

module.exports = pageHighlighting
