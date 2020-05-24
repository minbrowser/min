/* global spacesRegex oneWeekAgo historyInMemoryCache calculateHistoryScore */

/* depends on placesWorker.js */

function processSearchText (text) {
  // the order of these transformations is important - for example, spacesRegex removes / characters, so protocols must be removed before it runs
  return text.toLowerCase().split('?')[0].replace('http://', '').replace('https://', '').replace('www.', '').replace(spacesRegex, ' ')
}

function searchPlaces (searchText, callback, options) {
  function processSearchItem (item) {
    if (limitToBookmarks && !item.isBookmarked) {
      return
    }
    let itextURL = processSearchText(item.url)
    let itext = itextURL

    if (item.url !== item.title) {
      itext += ' ' + item.title.toLowerCase().replace(spacesRegex, ' ')
    }

    if (item.tags) {
      itext += ' ' + item.tags.join(' ')
    }

    const tindex = itext.indexOf(st)

    // if the url contains the search string, count as a match
    // prioritize matches near the beginning of the url
    if (tindex === 0) {
      item.boost = itemStartBoost // large amount of boost for this
      matches.push(item)
    } else if (tindex !== -1) {
      item.boost = exactMatchBoost
      matches.push(item)
    } else {
      // if all of the search words (split by spaces, etc) exist in the url, count it as a match, even if they are out of order

      if (substringSearchEnabled) {
        let substringMatch = true

        // check if the search text matches but is out of order
        for (let i = 0; i < swl; i++) {
          if (itext.indexOf(searchWords[i]) === -1) {
            substringMatch = false
            break
          }
        }

        if (substringMatch) {
          item.boost = 0.125 * swl + (0.02 * stl)
          matches.push(item)
          return
        }
      }

      if (item.visitCount !== 1 || item.lastVisit > oneWeekAgo) { // if the item has been visited more than once, or has been visited in the last week, we should calculate the fuzzy score. Otherwise, it is ignored. This reduces the number of bad results and increases search speed.
        const score = itextURL.score(st, 0)

        if (score > 0.4 + (0.00075 * itextURL.length)) {
          item.boost = score * 0.5

          if (score > 0.62) {
            item.boost += 0.33
          }

          matches.push(item)
        }
      }
    }
  }

  const matches = []
  const st = processSearchText(searchText)
  const stl = searchText.length
  const searchWords = st.split(' ')
  const swl = searchWords.length
  let substringSearchEnabled = false
  const itemStartBoost = Math.min(2.5 * stl, 10)
  const exactMatchBoost = 0.4 + (0.075 * stl)
  const limitToBookmarks = options && options.searchBookmarks
  const resultsLimit = options && options.limit || 100

  if (searchText.indexOf(' ') !== -1) {
    substringSearchEnabled = true
  }

  for (let i = 0; i < historyInMemoryCache.length; i++) {
    if (matches.length > (resultsLimit * 2)) {
      break
    }
    processSearchItem(historyInMemoryCache[i])
  }

  matches.sort(function (a, b) { // we have to re-sort to account for the boosts applied to the items
    return calculateHistoryScore(b) - calculateHistoryScore(a)
  })

  // clean up
  matches.forEach(function (match) {
    match.boost = 0
  })

  callback(matches.slice(0, resultsLimit))
}
