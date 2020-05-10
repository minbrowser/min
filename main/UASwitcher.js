/* Use the same user agent as Chrome to improve site compatibility and increase fingerprinting resistance
see https://github.com/minbrowser/min/issues/657 for more information */

let defaultUserAgent = app.userAgentFallback
let newUserAgent

if (settings.get('customUserAgent')) {
  newUserAgent = settings.get('customUserAgent')
} else {
  newUserAgent = defaultUserAgent.replace(/Min\/\S+\s/, '').replace(/Electron\/\S+\s/, '')
}
app.userAgentFallback = newUserAgent
