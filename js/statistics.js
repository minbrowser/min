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

    if (!settings.get('clientID')) {
      settings.set('clientID', Math.random().toString().slice(2))
    }
    if (!settings.get('installTime')) {
      settings.set('installTime', Date.now())
    }
  }
}

module.exports = statistics
