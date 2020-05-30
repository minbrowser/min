var tabEditor = require('navbar/tabEditor.js')

var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarAutocomplete = require('searchbar/searchbarAutocomplete.js')

var searchEngine = require('util/searchEngine.js')

// format is {phrase, snippet, score, icon, fn, isCustom, isAction} to match https://ac.duckduckgo.com/ac?q=!

// isAction describes whether the !bang is an action (like "open preferences"), or a place to search (like "search reading list items")

var customBangs = []

function registerCustomBang (data) {
  customBangs.push({
    phrase: data.phrase,
    snippet: data.snippet,
    score: data.score || 256000,
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

var saveBangUseCounts = debounce(function () {
  localStorage.setItem('bangUseCounts', JSON.stringify(bangUseCounts))
}, 10000)

function incrementBangCount (bang) {
  // increment bangUseCounts

  if (bangUseCounts[bang]) {
    bangUseCounts[bang]++
  } else {
    bangUseCounts[bang] = 1
  }

  // prevent the data from getting too big

  if (bangUseCounts[bang] > 100) {
    for (var bang in bangUseCounts) {
      bangUseCounts[bang] = Math.floor(bangUseCounts[bang] * 0.8)

      if (bangUseCounts[bang] < 2) {
        delete bangUseCounts[bang]
      }
    }
  }

  saveBangUseCounts()
}

// results is an array of {phrase, snippet, image}
function showBangSearchResults (text, results, input, event, limit = 5) {
  searchbarPlugins.reset('bangs')

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

  results.slice(0, limit).forEach(function (result, idx) {

    // autocomplete the bang, but allow the user to keep typing

    var data = {
      icon: result.icon,
      iconImage: result.image,
      title: result.snippet,
      secondaryText: result.phrase,
      fakeFocus: text !== '!' && idx === 0
    }

    data.click = function (e) {
      // if the item is an action, clicking on it should immediately trigger it instead of prompting for additional text
      if (result.isAction && result.fn) {
        searchbar.openURL(result.phrase, e)
        return
      }

      setTimeout(function () {
        incrementBangCount(result.phrase)

        input.value = result.phrase + ' '
        input.focus()

        // show search suggestions for custom bangs
        if (result.showSuggestions) {
          result.showSuggestions('', input, event)
        }
      }, 66)
    }

    searchbarPlugins.addResult('bangs', data)
  })
}

function getBangSearchResults (text, input, event) {
  // if there is a space in the text, show bang search suggestions (only supported for custom bangs)

  if (text.indexOf(' ') !== -1) {
    var bang = getCustomBang(text)

    if (bang && bang.showSuggestions) {
      bang.showSuggestions(text.replace(bang.phrase, '').trimLeft(), input, event)
      return
    } else if (text.trim().indexOf(' ') !== -1) {
      searchbarPlugins.reset('bangs')
      return
    }
  }

  // otherwise search for bangs

  var resultsPromise

  // get results from DuckDuckGo if it is a search engine, and the current tab is not a private tab
  if (searchEngine.getCurrent().name === 'DuckDuckGo' && !tabs.get(tabs.getSelected()).private) {
    resultsPromise = fetch('https://ac.duckduckgo.com/ac/?t=min&q=' + encodeURIComponent(text), {
      cache: 'force-cache'
    })
      .then(function (response) {
        return response.json()
      })
  } else {
    resultsPromise = new Promise(function (resolve, reject) {
      // autocomplete doesn't work if we attempt to autocomplete at the same time as the key is being pressed, so add a small delay (TODO fix this)
      setTimeout(function () {
        resolve([])
      }, 0)
    })
  }

  resultsPromise.then(function (results) {
    if (text === '!') {
      // if we're listing all commands, limit the number of site results so that there's space to show more browser commands
      // but if there's search text, the results are capped elsewhere, and low-ranking results should be included here
      // in case they end up being sorted to the top based on usage
      results = results.slice(0, 8)
    }
    results = results.concat(searchCustomBangs(text))
    if (text === '!') {
      showBangSearchResults(text, results, input, event, 4)
      searchbarPlugins.addResult('bangs', {
        title: l('showMoreBangs'),
        icon: 'fa-angle-down',
        click: function () {
          showBangSearchResults(text, results, input, event, Infinity)
        }
      })
    } else {
      showBangSearchResults(text, results, input, event)

      if (results[0] && event.keyCode !== 8) {
        searchbarAutocomplete.autocomplete(input, [results[0].phrase])
      }
    }
  })
}

function initialize () {
  searchbarPlugins.register('bangs', {
    index: 1,
    trigger: function (text) {
      return !!text && text.indexOf('!') === 0
    },
    showResults: getBangSearchResults
  })

  searchbarPlugins.registerURLHandler(function (url) {
    if (url.indexOf('!') === 0) {
      incrementBangCount(url.split(' ')[0])

      var bang = getCustomBang(url)

      if ((!bang || !bang.isAction) && url.split(' ').length === 1 && !url.endsWith(' ')) {
        // the bang is non-custom or a custom bang that requires search text, so add a space after it
        tabEditor.show(tabs.getSelected(), url + ' ')
        return true
      } else if (bang) {
        // there is a custom bang that is an action or has search text, so it can be run
        tabEditor.hide()
        bang.fn(url.replace(bang.phrase, '').trimLeft())
        return true // override the default action
      }
    }
  })
}

module.exports = {initialize, registerCustomBang}
