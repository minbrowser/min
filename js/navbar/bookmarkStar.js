const db = require('util/database.js').db
const places = require('places/places.js')
const bookmarkEditor = require('searchbar/bookmarkEditor.js')
const searchbar = require('searchbar/searchbar.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')

const bookmarkStar = {
  create: function (tabId) {
    const star = document.createElement('button')
    star.className = 'fa fa-star-o tab-icon bookmarks-button' // alternative icon is fa-bookmark
    star.setAttribute('title', l('addBookmark'))
    star.setAttribute('aria-label', l('addBookmark'))

    star.addEventListener('click', function (e) {
      bookmarkStar.onClick(tabId, star)
    })

    bookmarkStar.update(tabId, star)

    return star
  },
  onClick: function (tabId, star) {
    searchbarPlugins.clearAll()

    star.classList.toggle('fa-star')
    star.classList.toggle('fa-star-o')

    places.toggleBookmarked(tabId, function (isBookmarked) {
      if (isBookmarked) {
        var editorInsertionPoint = document.createElement('div')
        searchbarPlugins.getContainer('simpleBookmarkTagInput').appendChild(editorInsertionPoint)
        bookmarkEditor.show(tabs.get(tabs.getSelected()).url, editorInsertionPoint, null, {simplified: true})
      } else {
        searchbar.showResults('')
      }
    })
  },
  update: function (tabId, star) {
    const currentURL = tabs.get(tabId).url

    if (!currentURL) { // no url, can't be bookmarked
      star.hidden = true
    } else {
      star.hidden = false
    }

    // check if the page is bookmarked or not, and update the star to match

    db.places.where('url').equals(currentURL).first(function (item) {
      if (item && item.isBookmarked) {
        star.classList.remove('fa-star-o')
        star.classList.add('fa-star')
      } else {
        star.classList.remove('fa-star')
        star.classList.add('fa-star-o')
      }
    })
  }
}

searchbarPlugins.register('simpleBookmarkTagInput', {
  index: 0
})

module.exports = bookmarkStar
