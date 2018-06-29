var searchbar = require('searchbar/searchbar.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')

// format is {phrase, snippet, score, icon, fn, isCustom, isAction} to match https://ac.duckduckgo.com/ac?q=!

// isAction describes whether the !bang is an action (like "open preferences"), or a place to search (like "search reading list items")

var customBangs = []

function registerCustomBang (data) {
  customBangs.push({
    phrase: data.phrase,
    snippet: data.snippet,
    score: data.score || 500000, // half of the default score
    icon: data.icon || 'fa-terminal',
    showSuggestions: data.showSuggestions,
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

function getCustomBang (text) {
  var bang = text.split(' ')[0]
  return customBangs.filter(function (item) {
    return item.phrase === bang
  })[0]
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

    var item = searchbarUtils.createItem(data)

    item.addEventListener('click', function (e) {

      // if the item is an action, clicking on it should immediately trigger it instead of prompting for additional text
      if (result.isAction && result.fn) {
        searchbar.openURL(result.phrase, e)
        return
      }

      setTimeout(function () {
        incrementBangCount(result.phrase)
        saveBangUseCounts()

        input.value = result.phrase + ' '
        input.focus()

        // show search suggestions for custom bangs
        if (result.showSuggestions) {
          result.showSuggestions('', input, event, container)
        }
      }, 66)
    })

    container.appendChild(item)
  })
}

function getBangSearchResults (text, input, event, container) {

  // if there is a space in the text, show bang search suggestions (only supported for custom bangs)

  if (text.indexOf(' ') !== -1) {
    var bang = getCustomBang(text)

    if (bang && bang.showSuggestions) {
      bang.showSuggestions(text.replace(bang.phrase, '').trimLeft(), input, event, container)
      return
    } else if (text.trim().indexOf(' ') !== -1) {
      empty(container)
      return
    }
  }

  // otherwise search for bangs

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

searchbarPlugins.register('bangs', {
  index: 1,
  trigger: function (text) {
    return !!text && text.indexOf('!') === 0
  },
  showResults: debounce(getBangSearchResults, 100)
})

searchbarPlugins.registerURLHandler({
  trigger: function (url) {
    return url.indexOf('!') === 0 && getCustomBang(url)
  },
  action: function (url) {
    var bang = getCustomBang(url)

    if (bang) {
      tabBar.leaveEditMode()
      bang.fn(url.replace(bang.phrase, '').trimLeft())
    }
  }
})
