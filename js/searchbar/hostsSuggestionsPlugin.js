var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var urlParser = require('util/urlParser.js')
const hosts = require('util/hosts.js')

function showHostsSuggestions (text, input, event) {
  searchbarPlugins.reset('hostsSuggestions')

  var results = hosts.filter(function (host) {
    // only match start of host string
    return host.indexOf(text) === 0
  })

  results.slice(0, 4).forEach(function (result) {
    searchbarPlugins.addResult('hostsSuggestions', {
      title: result,
      secondaryText: l('hostsFileEntry'),
      url: 'http://' + result
    })
  })
}

function initialize () {
  searchbarPlugins.register('hostsSuggestions', {
    index: 1,
    trigger: function (text) {
      return (hosts.length && typeof text === 'string' && text.length > 2)
    },
    showResults: showHostsSuggestions
  })
}

module.exports = {initialize}
