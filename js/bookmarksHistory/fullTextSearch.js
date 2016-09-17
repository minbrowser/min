var whitespaceRegex = /\s+/g
var notWordOrWhitespaceRegex = /[^\w\s]/g

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
  return string.trim().toLowerCase().replace(notWordOrWhitespaceRegex, ' ').split(whitespaceRegex).filter(function (token) {
    return !stopWords[token]
  }).slice(0, 20000)
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

// finds the documents that contain all of the prefixes in their searchIndex
// code from https://github.com/dfahlander/Dexie.js/issues/281
function getMatchingDocs (prefixes) {
  return db.transaction('r', db.places, function * () {
    // Parallell search for all prefixes - just select resulting primary keys
    const results = yield Dexie.Promise.all(prefixes.map(prefix => db.places
      .where('searchIndex')
      .equals(prefix)
      .primaryKeys()))

    // Intersect result set of primary keys
    const reduced = results
      .reduce((a, b) => {
        const set = new Set(b)
        return a.filter(k => set.has(k))
      })

    // Finally select entire documents from intersection
    return yield db.places.where('url').anyOf(reduced).limit(100).toArray()
  })
}

function fullTextPlacesSearch (searchText, callback) {
  var searchWords = tokenize(searchText)
  var sl = searchWords.length

  var searchWordsSet = new Set(searchWords)

  if (searchWords.length === 0) {
    callback([])
    return
  }

  getMatchingDocs(searchWords).then(function (docs) {
    var docTermCounts = {}
    var totalCounts = {}
    var totalIndexLength = 0

    for (var i = 0; i < sl; i++) {
      totalCounts[searchWords[i]] = 0
    }

    // count how many times each search term occurs in the document
    docs.forEach(function (doc) {
      var termCount = {}
      var index = doc.searchIndex

      for (var i = 0; i < sl; i++) {
        var count = 0
        var token = searchWords[i]

        var idx = doc.searchIndex.indexOf(token)

        while(idx !== -1) {
          count++
          idx = doc.searchIndex.indexOf(token, idx + 1)
        }

        termCount[searchWords[i]] = count
        totalCounts[searchWords[i]] += count
      }

      docTermCounts[doc.url] = termCount
      totalIndexLength += index.length
    })

    var dl = docs.length

    for (var i = 0; i < dl; i++) {
      var doc = docs[i]
      var indexLen = doc.searchIndex.length
      var termCounts = docTermCounts[doc.url]

      for (var x = 0; x < sl; x++) {
        doc.boost = Math.min(1 + ((termCounts[searchWords[x]]) / indexLen) / (totalCounts[searchWords[x]] / totalIndexLength) * 1.5, 2)
      }

      // these properties are never used, and sending them from the worker takes a long time

      delete doc.pageHTML
      delete doc.extractedText
      delete doc.searchIndex
    }

    callback(docs)
  })
}
