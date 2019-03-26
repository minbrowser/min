const searchEngine = require('util/searchEngine.js')

const hosts = require('./hosts.js')

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
    // assume anything with no spaces and a . is a URL
    if (url.indexOf(' ') === -1 && url.indexOf('.') > 0) {
      return true
    }
    // a host from the hosts file is also a URL
    var hostPart = url.replace(/(:|\/).+/, '')
    return hosts.indexOf(hostPart) > -1
  },
  parse: function (url) {
    url = url.trim() // remove whitespace common on copy-pasted url's

    if (!url) {
      return 'about:blank'
    }

    if (url.indexOf('view-source:') === 0) {
      var realURL = url.replace('view-source:', '')

      return 'view-source:' + urlParser.parse(realURL)
    }

    // if the URL is an internal URL, convert it to the correct file:// url
    if (url.startsWith('min:')) {
      try {
        var urlObj = new URL(url)
        var path = urlObj.pathname.replace('//', '')
        if (/^[a-zA-Z]+$/.test(path)) {
          // only paths with letters are allowed
          return urlParser.getFileURL(__dirname + '/pages/' + path + '/index.html' + urlObj.search)
        }
      } catch (e) {}
    }

    // if the url starts with a (supported) protocol, do nothing
    if (urlParser.isURL(url)) {
      return url
    }

    // if the url doesn't have a space and has a ., or is a host from hosts file, assume it is a url without a protocol
    if (urlParser.isURLMissingProtocol(url)) {
      return 'http://' + url
    }
    // else, do a search
    return searchEngine.getCurrent().searchURL.replace('%s', encodeURIComponent(url))
  },
  basicURL: function (url) {
    return urlParser.removeProtocol(url).replace(urlParser.trailingSlashRegex, '')
  },
  prettyURL: function (url) {
    try {
      var urlOBJ = new URL(url)
      return (urlOBJ.hostname + urlOBJ.pathname).replace(urlParser.startingWWWRegex, '$1').replace(urlParser.trailingSlashRegex, '')
    } catch (e) { // URL constructor will throw an error on malformed URLs
      return url
    }
  },
  isInternalURL: function (url) {
    return url.startsWith(urlParser.getFileURL(__dirname))
  },
  getSourceURL: function (url) {
    // converts internal URLs (like the PDF viewer or the reader view) to the URL of the page they are displaying
    if (urlParser.isInternalURL(url)) {
      var representedURL
      try {
        representedURL = new URLSearchParams(new URL(url).search).get('url')
      } catch(e) {}
      if (representedURL) {
        return representedURL
      } else {
        try {
          var pageName = url.match(/\/pages\/([a-zA-Z]+)\//)
          var urlObj = new URL(url)
          if (pageName) {
            return 'min://' + pageName[1] + urlObj.search
          }
        } catch (e) {}
      }
    }
    return url
  },
  getFileURL: function (path) {
    if (window.platformType === 'windows') {
      // convert backslash to forward slash
      path = path.replace(/\\/g, '/')
      // https://blogs.msdn.microsoft.com/ie/2006/12/06/file-uris-in-windows/

      // UNC path?
      if (path.startsWith('//')) {
        return 'file:' + path
      } else {
        return 'file:///' + path
      }
    } else {
      return 'file://' + path
    }
  }
}

module.exports = urlParser
