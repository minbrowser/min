// cache host file entries for host matching
var hosts = []

var HOSTS_FILE = process.platform === 'win32'
  ? 'C:/Windows/System32/drivers/etc/hosts'
  : '/etc/hosts'

fs.readFile(HOSTS_FILE, 'utf8', function (err, data) {
  if (err) {
    console.warn('error retrieving hosts file', err)
    return
  }

  var hostsMap = {} // this is used to deduplicate the list

  // truncate data to 1MB
  var truncationLimit = Math.pow(1024, 2)
  var isTruncated = false

  if (data.length > truncationLimit) {
    data = data.substring(0, truncationLimit)
    isTruncated = true
  }

  data = data.split('\n')

  if (isTruncated) { // if the data is truncated the last line won't be complete
    data = data.slice(0, -1)
  }

  data.forEach(function (line) {
    if (line.startsWith('#')) {
      return
    }
    line.split(/\s/g).forEach(function (host) {
      if (host.length > 0 && host !== '255.255.255.255' && host !== 'broadcasthost' && !hostsMap[host]) {
        hosts.push(host)
        hostsMap[host] = true
      }
    })
  })
})

var urlParser = {
  startingWWWRegex: /www\.(.+\..+\/)/g,
  trailingSlashRegex: /\/$/g,
  isURL: function (url) {
    return url.indexOf('http://') === 0 || url.indexOf('https://') === 0 || url.indexOf('file://') === 0 || url.indexOf('about:') === 0 || url.indexOf('chrome:') === 0 || url.indexOf('data:') === 0
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
  getDisplayURL: function (url) {
    // converts internal URLs (like the PDF viewer or the reader view) to the URL of the page they are displaying
    if (url.startsWith('file://' + __dirname)) {
      try {
        var realURL = new URLSearchParams(new URL(url).search).get('url')
        if (realURL) {
          return realURL
        }
      } catch(e) {}
    }
    return url
  }
}
