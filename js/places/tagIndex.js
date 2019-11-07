var tagIndex = {
  totalDocs: 0,
  termDocCounts: {},
  termTags: {},
  getPageTokens: function (page) {
    try {
      var url = new URL(page.url)
      var urlChunk = url.hostname + ' ' + url.pathname
    } catch (e) { }
    var tokens = tokenize(page.title + ' ' + urlChunk.split(/\W/g).join(' '))

    var generic = ['www', 'com', 'net', 'html', 'pdf', 'file']
    tokens = tokens.filter(t => t.length > 2 && !generic.includes(t))

    return tokens
  },
  existingDocs: [],
  addPage: function (page) {
    if (page.tags.length === 0) {
      return
    }

    tagIndex.totalDocs++

    var tokens = tagIndex.getPageTokens(page)

    tokens.filter((t, i) => tokens.indexOf(t) === i).forEach(function (token) {
      if (!tagIndex.termDocCounts[token]) {
        tagIndex.termDocCounts[token] = 1
      } else {
        tagIndex.termDocCounts[token]++
      }
    })

    page.tags.forEach(function (tag) {
      tokens.forEach(function (token) {
        if (!tagIndex.termTags[token]) {
          tagIndex.termTags[token] = {}
        }
        if (tagIndex.termTags[token][tag]) {
          tagIndex.termTags[token][tag]++
        } else {
          tagIndex.termTags[token][tag] = 1
        }
      })
    })
  },
  getSuggestedTags: function (page) {
    var tokens = tagIndex.getPageTokens(page)
    // get term frequency
    var terms = {}
    tokens.forEach(function (t) {
      if (!terms[t]) {
        terms[t] = 1
      } else {
        terms[t]++
      }
    })

    var probs = {}

    for (var term in terms) {
      var tf = terms[term] / tokens.length
      var idf = Math.log(tagIndex.totalDocs / (tagIndex.termDocCounts[term] || 1))
      var tfidf = tf * idf

      if (tagIndex.termTags[term]) {
        for (var tag in tagIndex.termTags[term]) {
          if (probs[tag]) {
            probs[tag] += tagIndex.termTags[term][tag] * tfidf
          } else {
            probs[tag] = tagIndex.termTags[term][tag] * tfidf
          }
        }
      }
    }

    var probsArr = Object.keys(probs).map(key => { return {tag: key, value: probs[key]} })

    probsArr = probsArr.sort((a, b) => { return b.value - a.value })

    return probsArr.filter(p => p.value > 0.9).map(p => p.tag)
  },
  getSuggestedItemsForTags: function (tags) {
    var set = historyInMemoryCache.filter(i => i.isBookmarked).map(p => {
      return {page: p, tags: tagIndex.getSuggestedTags(p)}
    })

    set = set.filter(function (result) {
      for (var i = 0; i < tags.length; i++) {
        if (!result.tags.includes(tags[i])) {
          return false
        }
      }
      return true
    })

    return set.map(i => i.page)
  }
}
