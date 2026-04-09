var searchbarPlugins = require('searchbar/searchbarPlugins.js')

var urlParser = require('util/urlParser.js')

function showDomainGuess (text) {
  searchbarPlugins.reset('domainGuess')

  if (!text || text.indexOf(' ') !== -1 || text.indexOf('!') === 0 || urlParser.isPossibleURL(text)) {
    return
  }

  searchbarPlugins.addResult('domainGuess', {
    icon: 'carbon:earth-filled',
    title: text,
    secondaryText: l('visitSite'),
    url: urlParser.parseAsURL(text)
  }, { allowDuplicates: true })
}

function initialize () {
  searchbarPlugins.register('domainGuess', {
    index: 3,
    trigger: function (text) {
      return !!text && !tabs.get(tabs.getSelected()).private
    },
    showResults: showDomainGuess
  })
}

module.exports = { initialize }
