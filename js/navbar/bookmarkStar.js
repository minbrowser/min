const db = require('util/database.js')
const places = require('places/places.js')

const bookmarkStar = {
  create: function (tabId) {
    const star = document.createElement('i')
    star.className = 'fa fa-star-o bookmarks-button' // alternative icon is fa-bookmark

    star.addEventListener('click', function (e) {
      bookmarkStar.onClick(tabId, star)
    })

    bookmarkStar.update(tabId, star)

    return star
  },
  onClick: function (tabId, star) {
    star.classList.toggle('fa-star')
    star.classList.toggle('fa-star-o')

    places.toggleBookmarked(tabId)
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

module.exports = bookmarkStar
