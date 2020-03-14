var tagIndex = {
  totalDocs: 0,
  termDocCounts: {},
  termTags: {},
  tagTagMap: {},
  tagCounts: {},
  tagUpdateTimes: {},
  getPageTokens: function (page) {
    var urlChunk = ''
    try {
      // ignore the TLD, since it doesn't predict tags very well
      urlChunk = new URL(page.url).hostname.split('.').slice(0, -1).join('.')
    } catch (e) { }
    var tokens = tokenize(page.title + ' ' + urlChunk)

    var generic = ['www', 'com', 'net', 'html', 'pdf', 'file']
    tokens = tokens.filter(t => t.length > 2 && !generic.includes(t))

    return tokens
  },
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

    page.tags.forEach(function (t1) {
      if (!tagIndex.tagCounts[t1]) {
        tagIndex.tagCounts[t1] = 1
      } else {
        tagIndex.tagCounts[t1]++
      }
      page.tags.forEach(function (t2) {
        if (t1 === t2) {
          return
        }
        if (!tagIndex.tagTagMap[t1]) {
          tagIndex.tagTagMap[t1] = {}
        }

        if (!tagIndex.tagTagMap[t1][t2]) {
          tagIndex.tagTagMap[t1][t2] = 1
        } else {
          tagIndex.tagTagMap[t1][t2]++
        }
      })
    })

    page.tags.forEach(function (tag) {
      if (!tagIndex.tagUpdateTimes[tag] || page.lastVisit > tagIndex.tagUpdateTimes[tag]) {
        tagIndex.tagUpdateTimes[tag] = page.lastVisit
      }
    })
  },
  removePage: function (page) {
    if (page.tags.length === 0) {
      return
    }

    tagIndex.totalDocs--

    var tokens = tagIndex.getPageTokens(page)

    tokens.filter((t, i) => tokens.indexOf(t) === i).forEach(function (token) {
      if (tagIndex.termDocCounts[token]) {
        tagIndex.termDocCounts[token]--
      }
    })

    page.tags.forEach(function (tag) {
      tokens.forEach(function (token) {
        if (tagIndex.termTags[token] && tagIndex.termTags[token][tag]) {
          tagIndex.termTags[token][tag]--
        }
      })
    })

    page.tags.forEach(function (t1) {
      if (tagIndex.tagCounts[t1]) {
        tagIndex.tagCounts[t1]--
      }

      page.tags.forEach(function (t2) {
        if (t1 === t2) {
          return
        }
        if (!tagIndex.tagTagMap[t1]) {
          tagIndex.tagTagMap[t1] = {}
        }

        if (tagIndex.tagTagMap[t1] && tagIndex.tagTagMap[t1][t2]) {
          tagIndex.tagTagMap[t1][t2]--
        }
      })
    })
  },
  onChange: function (oldPage, newPage) {
    tagIndex.removePage(oldPage)
    tagIndex.addPage(newPage)
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
          if (tagIndex.tagCounts[tag] < 2) {
            continue
          }
          if (!probs[tag]) {
            probs[tag] = 0
          }
          probs[tag] += (tagIndex.termTags[term][tag] / tagIndex.tagCounts[tag]) * tfidf
        }
      }
    }

    var probsArr = Object.keys(probs).map(key => { return {tag: key, value: probs[key]} })

    probsArr = probsArr.sort((a, b) => { return b.value - a.value })

    return probsArr.filter(p => p.value > 0.2).map(p => p.tag)
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

    return set.map(i => i.page).slice(0, 50)
  },
  autocompleteTags: function (searchTags) {
    // find which tags are most frequently associated with the searched tags
    var tagScores = []

    for (var tag in tagIndex.tagCounts) {
      var score = tagIndex.tagCounts[tag]
      searchTags.forEach(function (searchTag) {
        // tagtagMap[searchTag][tag] holds the number of items that have both searchTag and tag
        if (tagIndex.tagTagMap[searchTag]) {
          score *= tagIndex.tagTagMap[searchTag][tag] || 0
        } else {
          score = 0
        }
      })

      // prefer tags with a recently-visited (or created) page
      score *= Math.max(2 - ((Date.now() - tagIndex.tagUpdateTimes[tag]) / (14 * 24 * 60 * 60 * 1000)), 1)

      tagScores.push({tag, score})
    }

    return tagScores.filter(t => t.score > 0).sort((a, b) => b.score - a.score).map(i => i.tag)
  }
}
