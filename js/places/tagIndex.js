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
      const url = new URL(page.url)
      if (page.url.startsWith('file://') && url.searchParams.get('url')) {
        url = new URL(url.searchParams.get('url'))
      }
      urlChunk = url.hostname.split('.').slice(0, -1).join(' ') + ' ' + url.pathname.split('/').filter(p => p.length > 1).slice(0, 2).join(' ')
    } catch (e) { }

    var tokens = tokenize((/^(http|https|file):\/\//.test(page.title) ? '' : page.title) + ' ' + urlChunk)

    var generic = ['http', 'htps', 'www', 'com', 'net', 'html', 'pdf', 'file']
    tokens = tokens.filter(t => t.length > 2 && !generic.includes(t))

    //get unique tokens
    tokens = tokens.filter((t, i) => tokens.indexOf(t) === i)

    return tokens
  },
  addPage: function (page) {
    if (page.tags.length === 0) {
      return
    }

    tagIndex.totalDocs++

    var tokens = tagIndex.getPageTokens(page)

    tokens.forEach(function (token) {
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
  getAllTagsRanked: function (page) {
    var tokens = tagIndex.getPageTokens(page)

    var scores = {};
    var contributingDocs = {};
    var contributingTerms = {};

    for (var term of tokens) {
      for (var tag in tagIndex.termTags[term]) {
        if (!scores[tag]) {
          scores[tag] = 0;
        }
        if (!contributingDocs[tag]) {
          contributingDocs[tag] = 0;
        }
        if (!contributingTerms[tag]) {
          contributingTerms[tag] = 0;
        }

        if (tagIndex.tagCounts[tag] >= 2) {
            const docsWithTag = tagIndex.termTags[term]?.[tag] || 0;
            scores[tag] += Math.pow(docsWithTag  / (tagIndex.termDocCounts[term] || 1), 2) * (0.85 + 0.1 * Math.sqrt(tagIndex.termDocCounts[term]));

            contributingDocs[tag] += docsWithTag
            contributingTerms[tag]++;
        }
      }
    }

    var scoresArr = []

    for (var tag in scores) {
      if (tokens.includes(tokenize(tag)[0])) {
        scores[tag] *= 1.5;
      }
      if (contributingDocs[tag] > 1 && contributingTerms[tag] > 1) {
        scoresArr.push({tag, value: scores[tag]})
      } else {
        scoresArr.push({tag, value: 0})
      }
    }

    scoresArr = scoresArr.sort((a, b) => { return b.value - a.value })

    return scoresArr;
  },
  getSuggestedTags: function (page) {
    return tagIndex.getAllTagsRanked(page).slice(0,3).filter(p => p.value > 0.66).map(p => p.tag)
  },
  getSuggestedItemsForTags: function (tags) {
    var set = historyInMemoryCache
    .filter(i => i.isBookmarked)
    .filter(page => tags.some(tag => !page.tags.includes(tag)))
    .map(p => {
      return { page: p, tags: tagIndex.getAllTagsRanked(p).filter(t => t.value >= 1.1) }
    })

    set = set.filter(function (result) {
      for (var i = 0; i < tags.length; i++) {
        if (!result.tags.some(t => t.tag === tags[i])) {
          return false
        }
      }
      return true
    })

    set = set.map(item => {
      var tagScore = 0;
      item.tags.forEach(function(tag) {
        if (tags.includes(tag.tag)) {
          tagScore += tag.value;
        }
      })
      item.page.score = tagScore;

      return item.page
    })

    set = set.sort((a, b) => b.score - a.score)

    return set.slice(0, 20)
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

      tagScores.push({ tag, score })
    }

    return tagScores.filter(t => t.score > 0).sort((a, b) => b.score - a.score).map(i => i.tag)
  }
}
