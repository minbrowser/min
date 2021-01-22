/* Handles importing / exporting bookmarks to HTML */

const places = require('places/places.js')
const urlParser = require('util/urlParser.js')
const { db } = require('util/database.js')

const bookmarkConverter = {
  import: function (data) {
    const tree = new DOMParser().parseFromString(data, 'text/html')
    const bookmarks = Array.from(tree.getElementsByTagName('a'))
    bookmarks.forEach(function (bookmark) {
      const url = bookmark.getAttribute('href')
      if (!url || (!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('file:'))) {
        return
      }

      const data = {
        title: bookmark.textContent,
        isBookmarked: true,
        tags: []
      }
      try {
        data.lastVisit = parseInt(bookmark.getAttribute('add_date')) * 1000
      } catch (e) {}
      let parent = bookmark.parentElement
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
      places.updateItem(url, data)
    })
  },
  exportAll: function () {
    return new Promise(function (resolve, reject) {
      // build the tree structure
      const root = document.createElement('body')
      const heading = document.createElement('h1')
      heading.textContent = 'Bookmarks'
      root.appendChild(heading)
      const innerRoot = document.createElement('dl')
      root.appendChild(innerRoot)

      const folderRoot = document.createElement('dt')
      innerRoot.appendChild(folderRoot)
      // var folderHeading = document.createElement('h3')
      // folderHeading.textContent = 'Min Bookmarks'
      // folderRoot.appendChild(folderHeading)
      const folderBookmarksList = document.createElement('dl')
      folderRoot.appendChild(folderBookmarksList)

      db.places.each(function (item) {
        if (item.isBookmarked) {
          const itemRoot = document.createElement('dt')
          const a = document.createElement('a')
          itemRoot.appendChild(a)
          folderBookmarksList.appendChild(itemRoot)

          a.href = urlParser.getSourceURL(item.url)
          a.setAttribute('add_date', Math.round(item.lastVisit / 1000))
          if (item.tags.length > 0) {
            a.setAttribute('tags', item.tags.join(','))
          }
          a.textContent = item.title
          // Chrome will only parse the file if it contains newlines after each bookmark
          const textSpan = document.createTextNode('\n')
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
