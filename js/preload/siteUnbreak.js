/* a collection of various hacks to unbreak sites, mainly due to missing window.open() support */

/* drive.google.com - fixes clicking on files to open them */

if (window.location.hostname === 'drive.google.com') {
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
}

/* news.google.com - fixes clicking on news articles */

if (window.location.hostname === 'news.google.com') {
  window.open = null
}
