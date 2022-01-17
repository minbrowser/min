/* global db Dexie */

const stemmer = require('stemmer')
importScripts('../../ext/xregexp/nonLetterRegex.js')

const whitespaceRegex = /\s+/g

const ignoredCharactersRegex = /[']+/g

// stop words list from https://github.com/weixsong/elasticlunr.js/blob/master/lib/stop_word_filter.js
const stopWords = {
  '': true,
  a: true,
  able: true,
  about: true,
  across: true,
  after: true,
  all: true,
  almost: true,
  also: true,
  am: true,
  among: true,
  an: true,
  and: true,
  any: true,
  are: true,
  as: true,
  at: true,
  be: true,
  because: true,
  been: true,
  but: true,
  by: true,
  can: true,
  cannot: true,
  could: true,
  dear: true,
  did: true,
  do: true,
  does: true,
  either: true,
  else: true,
  ever: true,
  every: true,
  for: true,
  from: true,
  get: true,
  got: true,
  had: true,
  has: true,
  have: true,
  he: true,
  her: true,
  hers: true,
  him: true,
  his: true,
  how: true,
  however: true,
  i: true,
  if: true,
  in: true,
  into: true,
  is: true,
  it: true,
  its: true,
  just: true,
  least: true,
  let: true,
  like: true,
  likely: true,
  may: true,
  me: true,
  might: true,
  most: true,
  must: true,
  my: true,
  neither: true,
  no: true,
  nor: true,
  not: true,
  of: true,
  off: true,
  often: true,
  on: true,
  only: true,
  or: true,
  other: true,
  our: true,
  own: true,
  rather: true,
  said: true,
  say: true,
  says: true,
  she: true,
  should: true,
  since: true,
  so: true,
  some: true,
  than: true,
  that: true,
  the: true,
  their: true,
  them: true,
  then: true,
  there: true,
  these: true,
  they: true,
  this: true,
  tis: true,
  to: true,
  too: true,
  twas: true,
  us: true,
  wants: true,
  was: true,
  we: true,
  were: true,
  what: true,
  when: true,
  where: true,
  which: true,
  while: true,
  who: true,
  whom: true,
  why: true,
  will: true,
  with: true,
  would: true,
  yet: true,
  you: true,
  your: true
}

/* this is used in placesWorker.js when a history item is created */
function tokenize (string) {
  return string.trim().toLowerCase()
    .replace(ignoredCharactersRegex, '')
    .replace(nonLetterRegex, ' ')
  // remove diacritics
  // https://stackoverflow.com/a/37511463
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(whitespaceRegex).filter(function (token) {
      return !stopWords[token] && token.length <= 100
    })
    .map(token => stemmer(token))
    .slice(0, 20000)
}

// finds the documents that contain all of the prefixes in their searchIndex
// code from https://github.com/dfahlander/Dexie.js/issues/281
function fullTextQuery (tokens) {
  return db.transaction('r', db.places, function * () {
    // Parallell search for all tokens - just select resulting primary keys
    const tokenMatches = yield Dexie.Promise.all(tokens.map(prefix => db.places
      .where('searchIndex')
      .equals(prefix)
      .primaryKeys()))

    // count of the number of documents containing each token, used for tf-idf calculation

    var tokenMatchCounts = {}
    for (var i = 0; i < tokens.length; i++) {
      tokenMatchCounts[tokens[i]] = tokenMatches[i].length
    }

    var docResults = []

    /*
    A document matches if each search token is either 1) contained in the title, URL, or tags,
    even if it's part of a larger word, or 2) a word in the full-text index.
     */
    historyInMemoryCache.forEach(function (item) {
      var itext = (item.url + ' ' + item.title + ' ' + item.tags.join(' ')).toLowerCase()
      var matched = true
      for (var i = 0; i < tokens.length; i++) {
        if (!tokenMatches[i].includes(item.id) && !itext.includes(tokens[i])) {
          matched = false
          break
        }
      }
      if (matched) {
        docResults.push(item)
      }
    })

    /* Finally select entire documents from intersection.
    To improve perf, we only read the full text of 100 documents for ranking,
     but this could mean we miss relevant documents. So sort them based on page
     score (recency + visit count) and then only read the 100 highest-ranking ones,
     since these are most likely to be in the final results.
    */
    const ordered = docResults.sort(function (a, b) {
      return calculateHistoryScore(b) - calculateHistoryScore(a)
    }).map(i => i.id).slice(0, 100)

    return {
      documents: yield db.places.where('id').anyOf(ordered).toArray(),
      tokenMatchCounts
    }
  })
}

function fullTextPlacesSearch (searchText, callback) {
  const searchWords = tokenize(searchText)
  const sl = searchWords.length

  if (searchWords.length === 0) {
    callback([])
    return
  }

  fullTextQuery(searchWords).then(function (queryResults) {
    const docs = queryResults.documents

    const totalCounts = {}
    for (let i = 0; i < sl; i++) {
      totalCounts[searchWords[i]] = 0
    }

    const docTermCounts = {}
    const docIndexes = {}

    // find the number and position of the search terms in each document
    docs.forEach(function (doc) {
      const termCount = {}
      const index = doc.searchIndex.concat(tokenize(doc.title))
      const indexList = []

      for (let i = 0; i < sl; i++) {
        let count = 0
        const token = searchWords[i]

        let idx = index.indexOf(token)

        while (idx !== -1) {
          count++
          indexList.push(idx)
          idx = index.indexOf(token, idx + 1)
        }

        termCount[searchWords[i]] = count
        totalCounts[searchWords[i]] += count
      }

      docTermCounts[doc.url] = termCount
      docIndexes[doc.url] = indexList.sort((a, b) => a - b)
    })

    const dl = docs.length

    for (let i = 0; i < dl; i++) {
      const doc = docs[i]
      const indexLen = doc.searchIndex.length
      const termCounts = docTermCounts[doc.url]

      if (!doc.boost) {
        doc.boost = 0
      }

      // add boost when search terms appear close to each other

      const indexList = docIndexes[doc.url]
      let totalWordDistanceBoost = 0

      for (let n = 1; n < indexList.length; n++) {
        const distance = indexList[n] - indexList[n - 1]
        if (distance < 50) {
          totalWordDistanceBoost += Math.pow(50 - distance, 2) * 0.000075
        }
        if (distance === 1) {
          totalWordDistanceBoost += 0.05
        }
      }

      doc.boost += Math.min(totalWordDistanceBoost, 7.5)

      // calculate bm25 score
      // https://en.wikipedia.org/wiki/Okapi_BM25

      const k1 = 1.5
      const b = 0.75

      let bm25 = 0
      for (let x = 0; x < sl; x++) {
        const nqi = queryResults.tokenMatchCounts[searchWords[x]]
        const bmIdf = Math.log(((historyInMemoryCache.length - nqi + 0.5) / (nqi + 0.5)) + 1)

        const tf = termCounts[searchWords[x]]
        const scorePart2 = (tf * (k1 + 1)) / (tf + (k1 * (1 - b + (b * (indexLen / 500))))) // 500 is estimated average page length

        bm25 += bmIdf * scorePart2
      }

      doc.boost += bm25

      // generate a search snippet for the document

      const snippetIndex = doc.extractedText ? doc.extractedText.split(/\s+/g) : []

      // array of 0 or 1 - 1 indicates this item in the snippetIndex is a search word
      const mappedArr = snippetIndex.map(w => searchWords.includes(stemmer(w.toLowerCase().replace(nonLetterRegex, ''))) ? 1 : 0)

      // find the bounds of the max subarray within mappedArr
      let indexBegin = -10
      let indexEnd = 0
      let currentScore = 0
      let maxScore = 0
      let maxBegin = -10
      let maxEnd = 0
      for (let i2 = 0; i2 < mappedArr.length; i2++) {
        if (indexBegin >= 0) {
          currentScore -= mappedArr[indexBegin]
        }
        currentScore += mappedArr[indexEnd]
        if (currentScore > maxScore || (currentScore > 0 && currentScore === maxScore && (indexBegin - maxBegin <= 1))) {
          maxBegin = indexBegin
          maxEnd = indexEnd
          maxScore = currentScore
        }
        indexBegin++
        indexEnd++
      }

      // include a few words before the start of the match
      maxBegin = maxBegin - 2

      // shift a few words farther back if doing so makes the snippet start at the beginning of a phrase or sentence
      for (let bound = maxBegin; bound >= maxBegin - 10 && bound > 0; bound--) {
        if (snippetIndex[bound].endsWith('.') || snippetIndex[bound].endsWith(',')) {
          maxBegin = bound + 1
          break
        }
      }

      const snippet = snippetIndex.slice(maxBegin, maxEnd + 5).join(' ')
      if (snippet) {
        doc.searchSnippet = snippet + '...'
      }

      // these properties are never used, and sending them from the worker takes a long time
      delete doc.pageHTML
      delete doc.extractedText
      delete doc.searchIndex
    }

    callback(docs)
  })
    .catch(e => console.error(e))
}
