var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')

var urlParser = require('util/urlParser.js')
var searchEngine = require('util/searchEngine.js')

var ddgAttribution = l('resultsFromDDG')

function removeTags (text) {
  return text.replace(/<.*?>/g, '')
}

// custom instant answers

var instantAnswers = {
  color_code: function (searchText, answer) {
    var data = {
      title: searchText,
      descriptionBlock: answer.replace(/\n/g, ' · ').replace(/\s~\s/g, ' · '),
      attribution: ddgAttribution
    }

    var rgb = answer.split(' ~ ').filter(function (format) {
      return format.startsWith('RGBA')
    })

    if (rgb[0]) {
      data.colorCircle = rgb[0]
    }

    return data
  },
  currency_in: function (searchText, answer) {
    var title = ''
    if (typeof answer === 'string') { // there is only one currency
      title = answer
    } else { // multiple currencies
      var currencyArr = []
      for (var countryCode in answer) {
        currencyArr.push(answer[countryCode] + ' (' + countryCode + ')')
      }

      title = currencyArr.join(', ')
    }

    if (answer.data) {
      var descriptionBlock = answer.data.title
    } else {
      var descriptionBlock = l('DDGAnswerSubtitle')
    }

    return {
      title: title,
      descriptionBlock: descriptionBlock,
      attribution: ddgAttribution
    }
  }
}

function showSearchbarInstantAnswers (text, input, event) {
  // only make requests to the DDG api if DDG is set as the search engine
  if (searchEngine.getCurrent().name !== 'DuckDuckGo') {
    return
  }

  // don't make a request if the searchbar has already closed

  if (!searchbar.associatedInput) {
    return
  }

  fetch('https://api.duckduckgo.com/?t=min&skip_disambig=1&no_redirect=1&format=json&q=' + encodeURIComponent(text)).then(function (data) {
    return data.json()
  }).then(function (res) {
    searchbarPlugins.reset('instantAnswers')

    // if there is a custom format for the answer, use that
    if (instantAnswers[res.AnswerType]) {
      var data = instantAnswers[res.AnswerType](text, res.Answer)

    // use the default format
    } else if (res.Abstract || (res.Answer && typeof res.Answer === 'string')) {
      var data = {
        title: (typeof res.Answer === 'string' && removeTags(res.Answer)) || removeTags(res.Heading),
        descriptionBlock: res.Abstract || l('DDGAnswerSubtitle'),
        attribution: ddgAttribution,
        url: res.AbstractURL || text
      }

      if (res.Image && !res.ImageIsLogo) {
        data.image = res.Image
      }

    // show a disambiguation
    } else if (res.RelatedTopics) {
      res.RelatedTopics.slice(0, 3).forEach(function (item) {
        // the DDG api returns the entity name inside an <a> tag
        var entityName = item.Result.replace(/.*>(.+?)<.*/g, '$1')

        // the text starts with the entity name, remove it
        var desc = item.Text.replace(entityName, '')

        // try to convert the given url to a wikipedia link
        var entityNameRegex = /https:\/\/duckduckgo.com\/(.*?)\/?$/

        if (entityNameRegex.test(item.FirstURL)) {
          var url = 'https://wikipedia.org/wiki/' + entityNameRegex.exec(item.FirstURL)[1]
        } else {
          var url = item.FirstURL
        }

        searchbarPlugins.addResult('instantAnswers', {
          title: entityName,
          descriptionBlock: desc,
          url: url
        }, {allowDuplicates: true})
      })
    }

    if (data) {
      // answers are more relevant, they should be displayed at the top
      if (res.Answer) {
        searchbarPlugins.setTopAnswer('instantAnswers', data)
      } else {
        searchbarPlugins.addResult('instantAnswers', data, {allowDuplicates: true})
      }
    }

    // suggested site links
    if (searchbarPlugins.getResultCount() < 4 && res.Results && res.Results[0] && res.Results[0].FirstURL) {
      var url = res.Results[0].FirstURL

      searchbarPlugins.addResult('instantAnswers', {
        icon: 'fa-globe',
        title: urlParser.basicURL(url),
        secondaryText: l('suggestedSite'),
        url: url,
        classList: ['ddg-answer']
      })
    }

    // if we're showing a location, show a "Search on OpenStreetMap" link

    var entitiesWithLocations = ['location', 'country', 'u.s. state', 'protected area']

    if (entitiesWithLocations.indexOf(res.Entity) !== -1) {
      searchbarPlugins.addResult('instantAnswers', {
        icon: 'fa-search',
        title: res.Heading,
        secondaryText: l('searchWith').replace('%s', 'OpenStreetMap'),
        classList: ['ddg-answer'],
        url: 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(res.Heading)
      })
    }
  }).catch(function (e) {
    console.error(e)
  })
}

function initialize () {
  searchbarPlugins.register('instantAnswers', {
    index: 3,
    trigger: function (text) {
      return text.length > 3 && !urlParser.isURLMissingProtocol(text) && !tabs.get(tabs.getSelected()).private
    },
    showResults: debounce(showSearchbarInstantAnswers, 200)
  })
}

module.exports = {initialize}
