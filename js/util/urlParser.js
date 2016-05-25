// cache host file entries for host matching
var hosts = []

var HOSTS_FILE = process.platform === 'win32'
  ? 'C:/Windows/System32/drivers/etc/hosts'
  : '/etc/hosts'

require('fs').readFile(HOSTS_FILE, 'utf8', function (err, data) {
  if (err) {
    return
  }

  data = data.replace(/(\s|#.*|255\.255\.255\.255|broadcasthost)+/g, ' ').split(' ')

  data.forEach(function (host) {
    if (host.length > 0 && hosts.indexOf(host) === -1) {
      hosts.push(host)
    }
  })
})

var urlParser = {
  startingWWWRegex: /www\.(.+\..+\/)/g,
  trailingSlashRegex: /\/$/g,
  isURL: function (url) {
    return url.indexOf('http://') === 0 || url.indexOf('https://') === 0 || url.indexOf('file://') === 0 || url.indexOf('about:') === 0 || url.indexOf('chrome:') === 0 || url.indexOf('data:') === 0
  },
  isSystemURL: function (url) {
    return url.indexOf('chrome') === 0 || url.indexOf('about:') === 0
  },
  removeProtocol: function (url) {
    if (!urlParser.isURL(url)) {
      return url
    }

    var withoutProtocol = url.replace('http://', '').replace('https://', '').replace('file://', '') // chrome:, about:, data: protocols intentionally not removed

    if (withoutProtocol.indexOf('www.') === 0) {
      return withoutProtocol.replace('www.', '')
    } else {
      return withoutProtocol
    }
  },
  isURLMissingProtocol: function (url) {
    if (url.indexOf(' ') === -1 && url.indexOf('.') > 0) {
      return true
    }
    var hostPart = url.replace(/(:|\/).+/, '')
    return hosts.indexOf(hostPart) > -1
  },
  parse: function (url) {
    url = url.trim() // remove whitespace common on copy-pasted url's

    if (!url) {
      return 'about:blank'
    }
    // if the url starts with a (supported) protocol, do nothing
    if (urlParser.isURL(url)) {
      return url
    }

    if (url.indexOf('view-source:') === 0) {
      var realURL = url.replace('view-source:', '')

      return 'view-source:' + urlParser.parse(realURL)
    }

    // if the url doesn't have a space and has a ., or is a host from hosts file, assume it is a url without a protocol
    if (urlParser.isURLMissingProtocol(url)) {
      return 'http://' + url
    }
    // else, do a search
    return currentSearchEngine.searchURL.replace('%s', encodeURIComponent(url))
  },
  prettyURL: function (url) {
    try {
      var urlOBJ = new URL(url)
      return (urlOBJ.hostname + urlOBJ.pathname).replace(urlParser.startingWWWRegex, '$1').replace(urlParser.trailingSlashRegex, '')
    } catch (e) { // URL constructor will throw an error on malformed URLs
      return url
    }
  },
  areEqual: function (url1, url2) {
    try {
      var obj1 = new URL(url1)
      var obj2 = new URL(url2)

      return obj1.hostname === obj2.hostname && obj1.pathname === obj2.pathname
    } catch (e) { // if either of the url's are invalid, the URL constructor will throw an error
      return url1 === url2
    }
  }
}
