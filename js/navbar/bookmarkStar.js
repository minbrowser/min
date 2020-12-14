const db = require('util/database.js').db
const places = require('places/places.js')
const bookmarkEditor = require('searchbar/bookmarkEditor.js')
const searchbar = require('searchbar/searchbar.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')

const bookmarkStar = {
  create: function () {
    const star = document.createElement('button')
    star.className = 'tab-editor-button bookmarks-button i carbon:star'
    star.setAttribute('aria-pressed', false)
    star.setAttribute('title', l('addBookmark'))
    star.setAttribute('aria-label', l('addBookmark'))

    star.addEventListener('click', function (e) {
      bookmarkStar.onClick(star)
    })

    return star
  },
  onClick: function (star) {
    var tabId = star.getAttribute('data-tab')

    searchbarPlugins.clearAll()

    star.classList.toggle('carbon:star')
    star.classList.toggle('carbon:star-filled')

    places.toggleBookmarked(tabId, function (isBookmarked) {
      if (isBookmarked) {
        star.classList.remove('carbon:star')
        star.classList.add('carbon:star-filled')
        // since the update happens asynchronously, and star.update() could be called after onClick but before the update, it's possible for the classes to get out of sync with the actual bookmark state. Updating them here fixes tis.
        star.setAttribute('aria-pressed', true)
        var editorInsertionPoint = document.createElement('div')
        searchbarPlugins.getContainer('simpleBookmarkTagInput').appendChild(editorInsertionPoint)
        bookmarkEditor.show(tabs.get(tabs.getSelected()).url, editorInsertionPoint, null, { simplified: true, autoFocus: true })
      } else {
        star.classList.add('carbon:star')
        star.classList.remove('carbon:star-filled')
        star.setAttribute('aria-pressed', false)
        searchbar.showResults('')
      }
    })
  },
  update: function (tabId, star) {
    star.setAttribute('data-tab', tabId)
    const currentURL = tabs.get(tabId).url

    if (!currentURL) { // no url, can't be bookmarked
      star.hidden = true
    } else {
      star.hidden = false
    }

    // check if the page is bookmarked or not, and update the star to match

    db.places.where('url').equals(currentURL).first(function (item) {
      if (item && item.isBookmarked) {
        star.classList.remove('carbon:star')
        star.classList.add('carbon:star-filled')
        star.setAttribute('aria-pressed', true)
      } else {
        star.classList.add('carbon:star')
        star.classList.remove('carbon:star-filled')
        star.setAttribute('aria-pressed', false)
      }
    })
  }
}

searchbarPlugins.register('simpleBookmarkTagInput', {
  index: 0
})

module.exports = bookmarkStar
