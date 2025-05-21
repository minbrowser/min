var settings = require('util/settings/settings.js')

const performanceSettings = {
  initialize: function () {
    // Initialize default performance settings if not set
    if (settings.get('enableHardwareAcceleration') === undefined) {
      settings.set('enableHardwareAcceleration', true)
    }
    if (settings.get('limitTabCaching') === undefined) {
      settings.set('limitTabCaching', false)
    }
    if (settings.get('maxCachedTabs') === undefined) {
      settings.set('maxCachedTabs', 5)
    }
    if (settings.get('preloadNextPage') === undefined) {
      settings.set('preloadNextPage', true)
    }
  },

  applySettings: function () {
    // Apply hardware acceleration setting
    if (settings.get('enableHardwareAcceleration')) {
      process.env.DISABLE_GPU = false
    } else {
      process.env.DISABLE_GPU = true
    }

    // Apply tab caching limits
    if (settings.get('limitTabCaching')) {
      const maxTabs = settings.get('maxCachedTabs')
      // Implementation will be handled by tab manager
    }
  }
}

module.exports = performanceSettings