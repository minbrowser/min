/* Use the same user agent as Chrome to improve site compatibility and increase fingerprinting resistance
see https://github.com/minbrowser/min/issues/657 for more information */

let defaultUserAgent = app.userAgentFallback
let newUserAgent = defaultUserAgent.replace(/Min\/\S+\s/, '').replace(/Electron\/\S+\s/, '')
app.userAgentFallback = newUserAgent


/* Some websites use more than the User-Agent for fingerprinting, and so the above change is not enough. */

app.once('ready', function () {
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = new URL(details.url);
    // Google login : Will throw a "Your browser is unsecured" and will not permit authentification,
    // even using a valid Chrome User-Agent
    // See https://github.com/timche/gmail-desktop/issues/174
    // Using a Firefox User-Agent works
    if(url.hostname == 'accounts.google.com') {
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0';
    }
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  })
})