/* Use the same user agent as Chrome to improve site compatibility and increase fingerprinting resistance
see https://github.com/minbrowser/min/issues/657 for more information */

function setUserAgent (session) {
  let defaultUserAgent = session.getUserAgent()
  let newUserAgent = defaultUserAgent.replace(/Min\/\S+\s/, '').replace(/Electron\/\S+\s/, '')
  session.setUserAgent(newUserAgent)
}

app.once('ready', function () {
  setUserAgent(session.defaultSession)
})

app.on('session-created', function (session) {
  setUserAgent(session)
})
