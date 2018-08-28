/* redirects to the phishing warning page when a message is recieved from the webview */

var browserUI = require('api-wrapper.js')

var phishingWarningPage = 'file://' + __dirname + '/pages/phishing/index.html'

webviews.bindIPC('phishingDetected', function (webview, tabId, args) {
  var url = webview.getURL()

  try {
    var hostname = new URL(url).hostname
    var redirectURL = phishingWarningPage + '?url=' + encodeURIComponent(url) + '&info=' + encodeURIComponent(args[0].join('\n'))
  } catch (e) {
    var hostname = ''
    var redirectURL = phishingWarningPage
  }

  settings.get('phishingWhitelist', function (value) {
    if (!value || !hostname || value.indexOf(hostname) === -1) {
      // show the warning page
      browserUI.navigate(tabId, redirectURL)
    }
  }, {
    fromCache: false
  })
})
