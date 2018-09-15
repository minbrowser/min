var searchbar = require('searchbar/searchbar.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')
var urlParser = require('util/urlParser.js')

function removeTags (text) {
  return text.replace(/<.*?>/g, '')
}

function showSearchbarInstantAnswers (text, input, event, container) {
  // only make requests to the DDG api if DDG is set as the search engine
  if (currentSearchEngine.name !== 'DuckDuckGo') {
    return
  }

  // don't make a request if the searchbar has already closed

  if (!searchbar.associatedInput) {
    return
  }

  fetch('https://api.duckduckgo.com/?t=min&skip_disambig=1&no_redirect=1&format=json&q=' + encodeURIComponent(text)).then(function (data) {
    return data.json()
  }).then(function (res) {
    empty(container)

    // if there is a custom format for the answer, use that
    if (instantAnswers[res.AnswerType]) {
      var item = instantAnswers[res.AnswerType](text, res.Answer)

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

      var item = searchbarUtils.createItem(data)

    // show a disambiguation
    } else if (res.RelatedTopics) {
      res.RelatedTopics.slice(0, 3).forEach(function (item) {
        // the DDG api returns the entity name inside an <a> tag
        var entityName = item.Result.replace(/.*>(.+?)<.*/g, '$1')

        // the text starts with the entity name, remove it
        var desc = item.Text.replace(entityName, '')

        var item = searchbarUtils.createItem({
          title: entityName,
          descriptionBlock: desc,
          url: item.FirstURL
        })

        container.appendChild(item)
      })

      searchbarPlugins.addResults(Math.min(res.RelatedTopics.length, 3))
    }

    if (item) {
      // answers are more relevant, they should be displayed at the top
      if (res.Answer) {
        searchbarPlugins.setTopAnswer('instantAnswers', item)
      } else {
        container.appendChild(item)
      }
    }

    // suggested site links
    if (searchbarPlugins.getResultCount() < 4 && res.Results && res.Results[0] && res.Results[0].FirstURL) {
      var url = res.Results[0].FirstURL

      var data = {
        icon: 'fa-globe',
        title: urlParser.basicURL(url),
        secondaryText: l('suggestedSite'),
        url: url,
        classList: ['ddg-answer']
      }

      var item = searchbarUtils.createItem(data)

      container.appendChild(item)
    }

    // if we're showing a location, show a "Search on OpenStreetMap" link

    var entitiesWithLocations = ['location', 'country', 'u.s. state', 'protected area']

    if (entitiesWithLocations.indexOf(res.Entity) !== -1) {
      var item = searchbarUtils.createItem({
        icon: 'fa-search',
        title: res.Heading,
        secondaryText: l('searchWith').replace('%s', 'OpenStreetMap'),
        classList: ['ddg-answer'],
        url: 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(res.Heading)
      })

      container.insertBefore(item, container.firstChild)
    }
  }).catch(function (e) {
    console.error(e)
  })
}

searchbarPlugins.register('instantAnswers', {
  index: 3,
  trigger: function (text) {
    return text.length > 3 && !urlParser.isURLMissingProtocol(text) && !tabs.get(tabs.getSelected()).private
  },
  showResults: debounce(showSearchbarInstantAnswers, 300)
})

// custom instant answers

var instantAnswers = {
  color_code: function (searchText, answer) {
    var item = searchbarUtils.createItem({
      title: searchText,
      descriptionBlock: answer.replace(/\n/g, ' · ').replace(/\s~\s/g, ' · '),
      attribution: ddgAttribution
    })

    var rgb = answer.split(' ~ ').filter(function (format) {
      return format.startsWith('RGBA')
    })

    if (rgb[0]) {
      var colorCircle = document.createElement('div')
      colorCircle.className = 'image color-circle'
      colorCircle.style.backgroundColor = rgb[0]

      item.insertBefore(colorCircle, item.firstChild)
    }

    return item
  },
  figlet: function (searchText, answer) {
    var formattedAnswer = removeTags(answer).replace('Font: standard', '')

    var item = searchbarUtils.createItem({
      descriptionBlock: formattedAnswer,
      attribution: ddgAttribution
    })

    var block = item.querySelector('.description-block')

    // display the data correctly
    block.style.whiteSpace = 'pre-wrap'
    block.style.fontFamily = 'monospace'
    block.style.maxHeight = '10em'
    block.style.webkitUserSelect = 'auto'

    return item
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

    var item = searchbarUtils.createItem({
      title: title,
      descriptionBlock: descriptionBlock,
      attribution: ddgAttribution
    })

    return item
  }
}
