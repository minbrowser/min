var whitespaceRegex = /\s+/g

function tokenize (string) {
  return string.trim().toLowerCase().split(whitespaceRegex)
}

/* re-index the history item whenever it is created or updated */

db.places.hook('creating', function (primaryKey, item, transaction) {
  item.searchIndex = tokenize(item.extractedText)
})
db.places.hook('updating', function (changes, primaryKey, item, transaction) {
  if (changes.extractedText) {
    if (typeof changes.extractedText == 'string') {
      return { searchIndex: tokenize(changes.extractedText) }
    } else {
      return { searchIndex: [] }
    }
  }
})

function fullTextPlacesSearch (searchText, callback) {
  var searchWords = tokenize(searchText)
  var swl = searchWords.length

  db.places.where('searchIndex').equals(searchWords[0]).distinct().toArray(function (items) {
    var searchResults = []
    var il = items.length

    // check if the item contains all of the search words
    outer: for (var x = 0; x < il; x++) {
      var item = items[x]
      for (var i = 0; i < swl; i++) {
        var token = searchWords[i]
        if (item.searchIndex.indexOf(token) === -1) {
          continue outer
        }
      }
      // the item contains all of the tokens
      searchResults.push(item)
    }

    console.log(searchResults)

    callback(searchResults)
  })
}
