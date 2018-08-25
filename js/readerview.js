var browserUI = require('api-wrapper.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')

var readerView = {
  readerURL: 'file://' + __dirname + '/reader/index.html',
  getReaderURL: function (url) {
    return readerView.readerURL + '?url=' + url
  },
  getButton: function (tabId) {
    // TODO better icon
    var item = document.createElement('i')
    item.className = 'fa fa-align-left reader-button'

    item.setAttribute('data-tab', tabId)
    item.setAttribute('title', l('enterReaderView'))

    item.addEventListener('click', function (e) {
      var tabId = this.getAttribute('data-tab')
      var tab = tabs.get(tabId)

      e.stopPropagation()

      if (tab.isReaderView) {
        readerView.exit(tabId)
      } else {
        readerView.enter(tabId)
      }
    })

    return item
  },
  updateButton: function (tabId) {
    var button = document.querySelector('.reader-button[data-tab="{id}"]'.replace('{id}', tabId))
    var tab = tabs.get(tabId)

    if (tab.isReaderView) {
      button.classList.add('is-reader')
      button.setAttribute('title', l('exitReaderView'))
      return
    } else {
      button.classList.remove('is-reader')
      button.setAttribute('title', l('enterReaderView'))
    }

    if (tab.readerable) {
      button.classList.add('can-reader')
    } else {
      button.classList.remove('can-reader')
    }
  },
  enter: function (tabId) {
    browserUI.navigate(tabId, readerView.readerURL + '?url=' + encodeURIComponent(tabs.get(tabId).url))
    tabs.update(tabId, {
      isReaderView: true
    })
  },
  exit: function (tabId) {
    browserUI.navigate(tabId, decodeURIComponent(tabs.get(tabId).url.split('?url=')[1]))
    tabs.update(tabId, {
      isReaderView: false
    })
  },
  showReadingList: function (container, filterText) {
    db.readingList.orderBy('time').reverse().toArray().then(function (articles) {
      empty(container)

      if (articles.length === 0) {
        var item = searchbarUtils.createItem({
          title: l('emptyReadingListTitle'),
          descriptionBlock: l('emptyReadingListSubtitle')
        })

        container.appendChild(item)
        return
      }

      articles.forEach(function (article) {
        if (!article.article) {
          return
        }

        // TODO integrate this with the regular history search system

        if (filterText) {
          var normalizedFilterText = filterText.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\W+/g, '')
          var normalizedArticleText = (article.url + article.article.title + article.article.excerpt).trim().toLowerCase().replace(/\s+/g, ' ').replace(/\W+/g, '')
          if (normalizedArticleText.indexOf(normalizedFilterText) === -1) {
            return
          }
        }

        var item = searchbarUtils.createItem({
          title: article.article.title,
          descriptionBlock: article.article.excerpt,
          url: readerView.getReaderURL(article.url),
          delete: function (el) {
            db.readingList.where('url').equals(el.getAttribute('data-url')).delete()
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

/* typing !readinglist in the searchbar shows the list */

registerCustomBang({
  phrase: '!readinglist',
  snippet: l('viewReadingList'),
  isAction: false,
  showSuggestions: function (text, input, event, container) {
    readerView.showReadingList(container, text)
  }
})

// update the reader button on page load

webviews.bindEvent('did-finish-load', function (e) {
  var tab = webviews.getTabFromContents(this)
  webviews.callAsync(tab, 'getURL', null, function (url) {
    if (url.indexOf(readerView.readerURL) === 0) {
      tabs.update(tab, {
        isReaderView: true,
        readerable: false // assume the new page can't be readered, we'll get another message if it can
      })
    } else {
      tabs.update(tab, {
        isReaderView: false,
        readerable: false
      })
    }

    readerView.updateButton(tab)
  })
})

webviews.bindIPC('canReader', function (webview, tab) {
  tabs.update(tab, {
    readerable: true
  })
  readerView.updateButton(tab)
})
