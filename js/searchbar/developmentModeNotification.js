var searchbarPlugins = require('searchbar/searchbarPlugins.js')

function initialize () {
  searchbarPlugins.register('developmentModeNotification', {
    index: 0,
    trigger: function (text) {
      return 'development-mode' in window.globalArgs
    },
    showResults: function () {
      searchbarPlugins.reset('developmentModeNotification')
      searchbarPlugins.addResult('developmentModeNotification', {
        title: 'Development Mode Enabled'
      })
    }
  })
}

module.exports = { initialize }
