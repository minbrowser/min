var searchbarPlugins = require('searchbar/searchbarPlugins.js')

var urlParser = require('util/urlParser.js')

function showDomainGuess (text) {
  searchbarPlugins.reset('domainGuess')

  if (!text || text.indexOf(' ') !== -1 || text.indexOf('!') === 0 || urlParser.isPossibleURL(text)) {
    return
  }

  var url

  if (urlParser.isHTTPSUpgreadable(text)) {
    url = 'https://' + text
  } else {
    url = 'http://' + text
  }

  searchbarPlugins.addResult('domainGuess', {
    icon: 'carbon:earth-filled',
    title: text,
    secondaryText: l('visitSite'),
    url: url
  }, { allowDuplicates: true })
}

function initialize () {
  searchbarPlugins.register('domainGuess', {
    index: 3,
    trigger: function (text) {
      return !!text
    },
    showResults: showDomainGuess
  })
}

module.exports = { initialize }
