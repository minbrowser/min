var scriptsToRun = []

/* a collection of various hacks to unbreak sites, mainly due to missing window.open() support */

/* all sites - re-implements window.close, since the built-in function doesn't work correctly */

window.addEventListener('message', function (e) {
  if (e.data === 'close-window') {
    ipc.send('close-window')
  }
})

scriptsToRun.push(`
  window.close = function () {
    postMessage('close-window', '*')
  }
`)

if (window.location.hostname === 'google.com' || window.location.hostname.endsWith('.google.com')) {
  /* define window.chrome
     this is necessary because some websites (such as the Google Drive file viewer, see issue #378) check for a
     Chrome user agent, and then do things like if(chrome.<module>) {}
     so we need to create a chrome object to prevent errors
     (https://github.com/electron/electron/issues/16587)
     */

  scriptsToRun.push(`
    window.chrome = {
      runtime: {
        connect: () => {
          return {
            onMessage: {
              addListener: () => {console.warn('chrome.runtime is not implemented')},
              removeListener: () => {console.warn('chrome.runtime is not implemented')},
            },
            postMessage: () => {console.warn('chrome.runtime is not implemented')},
            disconnect: () => {console.warn('chrome.runtime is not implemented')},
          }
        }
      }
    }
  `)
}

/* drive.google.com - fixes clicking on files to open them */

if (window.location.hostname === 'drive.google.com') {
  scriptsToRun.push(`
    var realWindowOpen = window.open

    window.open = function (url) {
      if (url) {
        return realWindowOpen(url)
      }
      return {
        document: new Proxy({}, {
          get: function () {
            return function () {
              return document.createElement('div')
            }
          },
          set: function () {
            console.warn('unpatched set', arguments)}
        }
        ),
        location: {
          replace: function (location) {
            realWindowOpen(location)
          }
        }
      }
    }
  `)
}

/* news.google.com - fixes clicking on news articles */

if (window.location.hostname === 'news.google.com') {
  scriptsToRun.push(`
    window.open = null
  `)
}

if (scriptsToRun.length > 0) {
  setTimeout(function () {
    electron.webFrame.executeJavaScript(scriptsToRun.join(';'))
  }, 0)
}
