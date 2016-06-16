// format is {phrase, snippet, score, icon, fn, isCustom, isAction} to match https://ac.duckduckgo.com/ac?q=!

// isAction describes whether the !bang is an action (like "open preferences"), or a place to search (like "search reading list items")

var customBangs = []

function registerCustomBang (data) {
  customBangs.push({
    phrase: data.phrase,
    snippet: data.snippet,
    score: data.score || 500000, // half of the default score
    icon: data.icon || 'fa-terminal',
    fn: data.fn,
    isCustom: true,
    isAction: data.isAction || false
  })
}

function searchCustomBangs (text) {
  return customBangs.filter(function (item) {
    return item.phrase.indexOf(text) === 0
  })
}

// format is {bang: count}
var bangUseCounts = JSON.parse(localStorage.getItem('bangUseCounts') || '{}')

function incrementBangCount (bang) {
  // increment bangUseCounts

  if (bangUseCounts[bang]) {
    bangUseCounts[bang]++
  } else {
    bangUseCounts[bang] = 1
  }

  // prevent the data from getting too big

  if (bangUseCounts[bang] > 1000) {
    for (var bang in bangUseCounts) {
      bangUseCounts[bang] = Math.floor(bangUseCounts[bang] * 0.9)

      if (bangUseCounts[bang] < 2) {
        delete bangUseCounts[bang]
      }
    }
  }
}

var saveBangUseCounts = debounce(function () {
  localStorage.setItem('bangUseCounts', JSON.stringify(bangUseCounts))
}, 10000)

// results is an array of {phrase, snippet, image}
function showBangSearchResults (results, input, event, container) {
  empty(container)

  results.sort(function (a, b) {
    var aScore = a.score || 1
    var bScore = b.score || 1
    if (bangUseCounts[a.phrase]) {
      aScore *= bangUseCounts[a.phrase]
    }
    if (bangUseCounts[b.phrase]) {
      bScore *= bangUseCounts[b.phrase]
    }

    return bScore - aScore
  })

  results.slice(0, 5).forEach(function (result) {

    // autocomplete the bang, but allow the user to keep typing

    var data = {
      icon: result.icon,
      iconImage: result.image,
      title: result.snippet,
      secondaryText: result.phrase
    }

    var item = createSearchbarItem(data)

    item.addEventListener('click', function (e) {

      // if the item is an action, clicking on it should immediately trigger it instead of prompting for additional text
      if (result.isAction && result.fn) {
        openURLFromsearchbar(e, result.phrase)
        return
      }

      setTimeout(function () {
        incrementBangCount(result.phrase)
        saveBangUseCounts()

        input.value = result.phrase + ' '
        input.focus()
      }, 66)
    })

    container.appendChild(item)
  })
}

function getBangSearchResults (text, input, event, container) {

  // get results from DuckDuckGo if it is a search engine, and the current tab is not a private tab
  if (currentSearchEngine.name === 'DuckDuckGo' && !tabs.get(tabs.getSelected()).private) {
    fetch('https://ac.duckduckgo.com/ac/?t=min&q=' + encodeURIComponent(text), {
      cache: 'force-cache'
    })
      .then(function (response) {
        return response.json()
      })
      .then(function (results) {
        // show the DuckDuckGo results, combined with the custom !bangs
        showBangSearchResults(results.concat(searchCustomBangs(text)), input, event, container)
      })
  } else {
    // otherwise, only show custom !bangs
    showBangSearchResults(searchCustomBangs(text), input, event, container)
  }
}

registerSearchbarPlugin('bangs', {
  index: 1,
  trigger: function (text) {
    return !!text && text.indexOf('!') === 0 && text.indexOf(' ') === -1
  },
  showResults: debounce(getBangSearchResults, 100)
})
