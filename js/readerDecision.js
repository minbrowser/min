/* Determines whether a page should redirect to reader view based on visit history */

const readerDecision = {
  trimURL: function (url) {
    var loc = new URL(url)
    loc.hash = ''
    return loc.toString()
  },
  shouldRedirect: function (url) {
    /*
    returns:
        -1: never redirect, even if the page is confirmed to be readerable
        0: redirect once the page is confirmed to be readerable
        1: redirect even before the page is confirmed to be readerable
    */

    url = readerDecision.trimURL(url)

    try {
      var urlObj = new URL(url)

      if (readerDecision.info.URLStatus[url]) {
        // we have data collected from a previous visit to this page
        if (readerDecision.info.URLStatus[url].isReaderable === true) {
          // we know it will be readable, redirect without waiting
          return 1
        } else if (readerDecision.info.URLStatus[url].isReaderable === false) {
          // we know it won't be readerable (or reader mode might be broken for the page), never redirect to it
          return -1
        }
      } else if (readerDecision.info.domainStatus[urlObj.hostname] === true) {
        // this domain has been set to auto reader mode
        // we don't know anything about the content of the page
        if (urlObj.pathname === '/') {
            // sometimes the domain homepage will have a lot of text and look like an article (examples: gutenberg.org, nytimes.com), but it almost never is, so we shouldn't redirect to reader view unless the page has been explicitly marked as readerable (in which case URLStatus will handle it above)
          return -1
        } else {
          return 0
        }
      }
    } catch (e) {
      console.warn('failed to parse URL', url, e)
    }

    return -1
  },
  setDomainStatus: function (url, autoRedirect) {
    readerDecision.info.domainStatus[new URL(url).hostname] = autoRedirect
    saveData()
  },
  getDomainStatus: function (url) {
    return readerDecision.info.domainStatus[new URL(url).hostname]
  },
  setURLStatus (url, isReaderable) {
    url = readerDecision.trimURL(url)

    readerDecision.info.URLStatus[url] = {lastVisit: Date.now(), isReaderable}
    saveData()
  },
  getURLStatus: function (url) {
    url = readerDecision.trimURL(url)

    return readerDecision.info.URLStatus[url].isReaderable
  },
  getSameDomainStatuses: function (url) {
    var results = []
    for (var itemURL in readerDecision.info.URLStatus) {
      try {
        if (new URL(itemURL).hostname === new URL(url).hostname && itemURL !== url) {
          results.push(readerDecision.info.URLStatus[itemURL])
        }
      } catch (e) {}
    }

    return results
  }
}

function loadData () {
  try {
    readerDecision.info = JSON.parse(localStorage.getItem('readerData')).data
  } catch (e) {}

  if (!readerDecision.info) {
    readerDecision.info = {
      domainStatus: {},
      URLStatus: {}
    }
  }
}

function saveData () {
  localStorage.setItem('readerData', JSON.stringify({version: 1, data: readerDecision.info}))
}

function cleanupData () {
  var removedEntries = false
  for (var url in readerDecision.info.URLStatus) {
    if (Date.now() - readerDecision.info.URLStatus[url].lastVisit > 6 * 7 * 24 * 60 * 60 * 1000) {
      delete readerDecision.info.URLStatus[url]
      removedEntries = true
    }
  }
  return removedEntries
}

loadData()
if (cleanupData()) {
  saveData()
}

window.addEventListener('storage', function (e) {
  if (e.key === 'readerData') {
    loadData()
  }
})

if (typeof module !== 'undefined') {
  module.exports = readerDecision
}
