var whitespaceRegex = /\s+/g

// stop words list from https://github.com/weixsong/elasticlunr.js/blob/master/lib/stop_word_filter.js
var stopWords = {
  '': true,
  'a': true,
  'able': true,
  'about': true,
  'across': true,
  'after': true,
  'all': true,
  'almost': true,
  'also': true,
  'am': true,
  'among': true,
  'an': true,
  'and': true,
  'any': true,
  'are': true,
  'as': true,
  'at': true,
  'be': true,
  'because': true,
  'been': true,
  'but': true,
  'by': true,
  'can': true,
  'cannot': true,
  'could': true,
  'dear': true,
  'did': true,
  'do': true,
  'does': true,
  'either': true,
  'else': true,
  'ever': true,
  'every': true,
  'for': true,
  'from': true,
  'get': true,
  'got': true,
  'had': true,
  'has': true,
  'have': true,
  'he': true,
  'her': true,
  'hers': true,
  'him': true,
  'his': true,
  'how': true,
  'however': true,
  'i': true,
  'if': true,
  'in': true,
  'into': true,
  'is': true,
  'it': true,
  'its': true,
  'just': true,
  'least': true,
  'let': true,
  'like': true,
  'likely': true,
  'may': true,
  'me': true,
  'might': true,
  'most': true,
  'must': true,
  'my': true,
  'neither': true,
  'no': true,
  'nor': true,
  'not': true,
  'of': true,
  'off': true,
  'often': true,
  'on': true,
  'only': true,
  'or': true,
  'other': true,
  'our': true,
  'own': true,
  'rather': true,
  'said': true,
  'say': true,
  'says': true,
  'she': true,
  'should': true,
  'since': true,
  'so': true,
  'some': true,
  'than': true,
  'that': true,
  'the': true,
  'their': true,
  'them': true,
  'then': true,
  'there': true,
  'these': true,
  'they': true,
  'this': true,
  'tis': true,
  'to': true,
  'too': true,
  'twas': true,
  'us': true,
  'wants': true,
  'was': true,
  'we': true,
  'were': true,
  'what': true,
  'when': true,
  'where': true,
  'which': true,
  'while': true,
  'who': true,
  'whom': true,
  'why': true,
  'will': true,
  'with': true,
  'would': true,
  'yet': true,
  'you': true,
  'your': true
}

function tokenize (string) {
  return string.trim().toLowerCase().split(whitespaceRegex).filter(function (token) {
    return !stopWords[token]
  })
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
