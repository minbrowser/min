/* Use the same user agent as Chrome to improve site compatibility and increase fingerprinting resistance
see https://github.com/minbrowser/min/issues/657 for more information */

const defaultUserAgent = app.userAgentFallback
let hasCustomUserAgent = false
let newUserAgent

if (settings.get('customUserAgent')) {
  newUserAgent = settings.get('customUserAgent')
  hasCustomUserAgent = true
} else {
  newUserAgent = defaultUserAgent.replace(/Min\/\S+\s/, '').replace(/Electron\/\S+\s/, '')
}
app.userAgentFallback = newUserAgent

/*
Google blocks signin in some cases unless a custom UA is used
see https://github.com/minbrowser/min/issues/868
*/
function enableGoogleUASwitcher (ses) {
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (!hasCustomUserAgent && details.url.includes('accounts.google.com')) {
      const url = new URL(details.url)

      if (url.hostname === 'accounts.google.com') {
        details.requestHeaders['User-Agent'] = newUserAgent + ' Edg/' + process.versions.chrome
      }
    }

    const chromiumVersion = process.versions.chrome.split('.')[0]
    details.requestHeaders['SEC-CH-UA'] = `"Chromium";v="${chromiumVersion}", " Not A;Brand";v="99"`
    details.requestHeaders['SEC-CH-UA-MOBILE'] = '?0'

    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })
}

app.once('ready', function () {
  enableGoogleUASwitcher(session.defaultSession)
})

app.on('session-created', enableGoogleUASwitcher)
