/* Handles importing / exporting bookmarks to HTML */

var places = require('places/places.js')
var urlParser = require('util/urlParser.js')
var { db } = require('util/database.js')

const bookmarkConverter = {
  import: function (data) {
    var tree = new DOMParser().parseFromString(data, 'text/html')
    var bookmarks = Array.from(tree.getElementsByTagName('a'))
    bookmarks.forEach(function (bookmark) {
      var url = bookmark.getAttribute('href')
      if (!url || (!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('file:'))) {
        return
      }

      var data = {
        title: bookmark.textContent,
        isBookmarked: true,
        tags: [],
        lastVisit: Date.now()
      }
      try {
        const last = parseInt(bookmark.getAttribute('add_date')) * 1000
        if (!isNaN(last)) {
          data.lastVisit = last
        }
      } catch (e) { }

      var parent = bookmark.parentElement
      while (parent != null) {
        if (parent.children[0] && parent.children[0].tagName === 'H3') {
          data.tags.push(parent.children[0].textContent.replace(/\s/g, '-'))
          break
        }
        parent = parent.parentElement
      }
      if (bookmark.getAttribute('tags')) {
        data.tags = data.tags.concat(bookmark.getAttribute('tags').split(','))
      }
      places.updateItem(url, data, () => { })
    })
  },
  exportAll: function () {
    return new Promise(function (resolve, reject) {
      // build the tree structure
      var root = document.createElement('body')
      var heading = document.createElement('h1')
      heading.textContent = 'Bookmarks'
      root.appendChild(heading)
      var innerRoot = document.createElement('dl')
      root.appendChild(innerRoot)

      var folderRoot = document.createElement('dt')
      innerRoot.appendChild(folderRoot)
      // var folderHeading = document.createElement('h3')
      // folderHeading.textContent = 'Min Bookmarks'
      // folderRoot.appendChild(folderHeading)
      var folderBookmarksList = document.createElement('dl')
      folderRoot.appendChild(folderBookmarksList)

      db.places.each(function (item) {
        if (item.isBookmarked) {
          var itemRoot = document.createElement('dt')
          var a = document.createElement('a')
          itemRoot.appendChild(a)
          folderBookmarksList.appendChild(itemRoot)

          a.href = urlParser.getSourceURL(item.url)
          a.setAttribute('add_date', Math.round(item.lastVisit / 1000))
          if (item.tags.length > 0) {
            a.setAttribute('tags', item.tags.join(','))
          }
          a.textContent = item.title
          // Chrome will only parse the file if it contains newlines after each bookmark
          var textSpan = document.createTextNode('\n')
          folderBookmarksList.appendChild(textSpan)
        }
      }).then(function () {
        resolve(root.outerHTML)
      })
        .catch(reject)
    })
  }
}

module.exports = bookmarkConverter
