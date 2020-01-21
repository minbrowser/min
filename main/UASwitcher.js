/* Use the same user agent as Chrome to improve site compatibility and increase fingerprinting resistance
see https://github.com/minbrowser/min/issues/657 for more information */

let defaultUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) old-airport-include/1.0.0 Chrome/79.0.3945.130 Electron/7.1.9 Safari/537.36' // app.userAgentFallback
let newUserAgent = defaultUserAgent.replace(/Min\/\S+\s/, '').replace(/Electron\/\S+\s/, '')
app.userAgentFallback = newUserAgent
