var webviews = require('webviews.js')
var browserUI = require('browserUI.js')
var searchbar = require('searchbar/searchbar.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')

var readerDecision = require('readerDecision.js')

var readerView = {
  readerURL: urlParser.getFileURL(__dirname + '/reader/index.html'),
  getReaderURL: function (url) {
    return readerView.readerURL + '?url=' + url
  },
  isReader: function (tabId) {
    return tabs.get(tabId).url.indexOf(readerView.readerURL) === 0
  },
  getButton: function (tabId) {
    // TODO better icon
    var button = document.createElement('i')
    button.className = 'fa fa-align-left reader-button'

    button.setAttribute('data-tab', tabId)

    button.addEventListener('click', function (e) {
      e.stopPropagation()

      if (readerView.isReader(tabId)) {
        readerView.exit(tabId)
      } else {
        readerView.enter(tabId)
      }
    })

    readerView.updateButton(tabId, button)

    return button
  },
  updateButton: function (tabId, button) {
    var button = button || document.querySelector('.reader-button[data-tab="{id}"]'.replace('{id}', tabId))
    var tab = tabs.get(tabId)

    if (readerView.isReader(tabId)) {
      button.classList.add('is-reader')
      button.setAttribute('title', l('exitReaderView'))
    } else {
      button.classList.remove('is-reader')
      button.setAttribute('title', l('enterReaderView'))

      if (tab.readerable) {
        button.classList.add('can-reader')
      } else {
        button.classList.remove('can-reader')
      }
    }
  },
  enter: function (tabId, url) {
    browserUI.navigate(tabId, readerView.readerURL + '?url=' + encodeURIComponent(url || tabs.get(tabId).url))
  },
  exit: function (tabId) {
    // this page should not be automatically readerable in the future
    readerDecision.setURLStatus(urlParser.getSourceURL(tabs.get(tabId).url), false)
    browserUI.navigate(tabId, decodeURIComponent(tabs.get(tabId).url.split('?url=')[1]))
  },
  printArticle: function (tabId) {
    if (!readerView.isReader(tabId)) {
      throw new Error("attempting to print in a tab that isn't a reader page")
    }

    webviews.get(tabId).executeJavaScript('parentProcessActions.printArticle()', false)
  },
  searchForArticles: function (filterText, cb) {
    var results = []
    db.readingList.orderBy('time').reverse().each(function (article) {
      if (!article.article) {
        return
      }

      if (filterText) {
        var normalizedFilterText = filterText.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\W+/g, '')
        var normalizedArticleText = (article.url + article.article.title + article.article.excerpt).trim().toLowerCase().replace(/\s+/g, ' ').replace(/\W+/g, '')
        if (normalizedArticleText.indexOf(normalizedFilterText) !== -1) {
          results.push(article)
        }
      } else {
        results.push(article)
      }
    }).then(function () {
      cb(results)
    })
  },
  showReadingList: function (container, filterText) {
    readerView.searchForArticles(filterText, function (articles) {
      empty(container)

      if (articles.length === 0) {
        var item = searchbarUtils.createItem({
          title: l('emptyReadingListTitle'),
          descriptionBlock: l('emptyReadingListSubtitle')
        })

        container.appendChild(item)
        return
      }

      articles.forEach(function (article, idx) {
        var item = searchbarUtils.createItem({
          title: article.article.title,
          descriptionBlock: article.article.excerpt,
          url: readerView.getReaderURL(article.url),
          classList: (idx === 0 ? ["fakefocus"] : null),
          delete: function (el) {
            db.readingList.where('url').equals(article.url).delete()
          }
        })

        if (article.visitCount > 5 || (article.extraData.scrollPosition > 0 && article.extraData.articleScrollLength - article.extraData.scrollPosition < 1000)) { // the article has been visited frequently, or the scroll position is at the bottom
          item.style.opacity = 0.65
        }

        container.appendChild(item)
      })
    })
  }
}

window.readerView = readerView

/* typing !readinglist in the searchbar shows the list */

registerCustomBang({
  phrase: '!readinglist',
  snippet: l('viewReadingList'),
  isAction: false,
  showSuggestions: function (text, input, event, container) {
    readerView.showReadingList(container, text)
  },
  fn: function (text) {
    readerView.searchForArticles(text, function (articles) {
      if (articles[0]) {
        searchbar.openURL(readerView.getReaderURL(articles[0].url))
      }
    })
  }
})

// update the reader button on page load

webviews.bindEvent('did-start-navigation', function (webview, tabId, e, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) {
  if (readerDecision.shouldRedirect(url) === 1) {
    // if this URL has previously been marked as readerable, load reader view without waiting for the page to load
    readerView.enter(tabId, url)
  } else if (isMainFrame && !isInPlace) {
    tabs.update(tabId, {
      readerable: false // assume the new page can't be readered, we'll get another message if it can
    })

    readerView.updateButton(tabId)
  }
})

webviews.bindIPC('canReader', function (webview, tab) {
  if (readerDecision.shouldRedirect(tabs.get(tab).url) >= 0) {
    // if automatic reader mode has been enabled for this domain, and the page is readerable, enter reader mode
    readerView.enter(tab)
  }

  tabs.update(tab, {
    readerable: true
  })
  readerView.updateButton(tab)
})
