const settings = require('util/settings/settings.js')

const statistics = {
  upload: function () {
    if (settings.get('collectUsageStats') === false) {
      return
    }

    fetch('https://services.minbrowser.org/stats/v1/collect', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientID: settings.get('clientID'),
        installTime: settings.get('installTime'),
        os: process.platform,
        lang: navigator.language,
        appVersion: window.globalArgs['app-version']
      })
    })
      .catch(e => console.warn('failed to send usage statistics', e))
  },
  initialize: function () {
    setTimeout(statistics.upload, 10000)
    setInterval(statistics.upload, 24 * 60 * 60 * 1000)

    settings.listen('collectUsageStats', function (value) {
      if (value === false) {
        // disabling stats collection should reset client ID
        settings.set('clientID', undefined)
      } else if (!settings.get('clientID')) {
        settings.set('clientID', Math.random().toString().slice(2))
      }
    })

    if (!settings.get('installTime')) {
      // round install time to nearest hour to reduce uniqueness
      const roundingFactor = 60 * 60 * 1000
      settings.set('installTime', Math.floor(Date.now() / roundingFactor) * roundingFactor)
    }
  }
}

module.exports = statistics
