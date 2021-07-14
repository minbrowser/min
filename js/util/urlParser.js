const punycode = require('punycode')
const path = require('path')

const searchEngine = require('util/searchEngine.js')
const hosts = require('./hosts.js')
const httpsTopSites = require('../../ext/httpsUpgrade/httpsTopSites.json')
const publicSuffixes = require('../../ext/publicSuffixes/public_suffix_list.json')

function removeWWW (domain) {
  return (domain.startsWith('www.') ? domain.slice(4) : domain)
}
function removeTrailingSlash (url) {
  return (url.endsWith('/') ? url.slice(0, -1) : url)
}

var urlParser = {
  validIP4Regex: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/i,
  validDomainRegex: /^(?!-)(?:.*@)*?([a-z0-9-._]+[a-z0-9]|\[[:a-f0-9]+\])/i,
  unicodeRegex: /[^\u0000-\u00ff]/,
  removeProtocolRegex: /^(https?|file):\/\//i,
  protocolRegex: /^[a-z0-9]+:\/\//, // URI schemes can be alphanum
  isURL: function (url) {
    return urlParser.protocolRegex.test(url) || url.indexOf('about:') === 0 || url.indexOf('chrome:') === 0 || url.indexOf('data:') === 0
  },
  isPossibleURL: function (url) {
    if (urlParser.isURL(url)) {
      return true
    } else {
      if (url.indexOf(' ') >= 0) {
        return false
      }
    }

    const domain = urlParser.getDomain(url)
    return hosts.includes(domain)
  },
  removeProtocol: function (url) {
    if (!urlParser.isURL(url)) {
      return url
    }

    /*
    Protocols removed: http:/https:/file:
    chrome:, about:, data: protocols intentionally not removed
    */
    return url.replace(urlParser.removeProtocolRegex, '')
  },
  isURLMissingProtocol: function (url) {
    return !urlParser.protocolRegex.test(url)
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
        var pathname = urlObj.pathname.replace('//', '')
        if (/^[a-zA-Z]+$/.test(pathname)) {
          // only paths with letters are allowed
          return urlParser.getFileURL(
            path.join(__dirname, 'pages', pathname, 'index.html') + urlObj.search
          )
        }
      } catch (e) {}
    }

    // if the url starts with a (supported) protocol
    if (urlParser.isURL(url)) {
      if (!urlParser.isInternalURL(url) && url.startsWith('http://')) {
        // prefer HTTPS over HTTP
        const noProtoURL = urlParser.removeProtocol(url)

        if (urlParser.isHTTPSUpgreadable(noProtoURL)) {
          return 'https://' + noProtoURL
        }
      }
      return url
    }

    // if the url doesn't have any protocol and it's a valid domain
    if (urlParser.isURLMissingProtocol(url) && urlParser.validateDomain(urlParser.getDomain(url))) {
      if (urlParser.isHTTPSUpgreadable(url)) { // check if it is HTTPS-able
        return 'https://' + url
      }
      return 'http://' + url
    }

    // else, do a search
    return searchEngine.getCurrent().searchURL.replace('%s', encodeURIComponent(url))
  },
  basicURL: function (url) {
    return removeWWW(urlParser.removeProtocol(removeTrailingSlash(url)))
  },
  prettyURL: function (url) {
    try {
      var urlOBJ = new URL(url)
      return removeWWW(removeTrailingSlash(urlOBJ.hostname + urlOBJ.pathname))
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
      } catch (e) {}
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
        return encodeURI('file:' + path)
      } else {
        return encodeURI('file:///' + path)
      }
    } else {
      return encodeURI('file://' + path)
    }
  },
  getDomain: function (url) {
    url = urlParser.removeProtocol(url)
    return url.split(/[/:]/)[0].toLowerCase()
  },
  // primitive domain validation based on RFC1034
  validateDomain: function (domain) {
    domain = urlParser.unicodeRegex.test(domain)
      ? punycode.toASCII(domain)
      : domain

    if (!urlParser.validDomainRegex.test(domain)) {
      return false
    }
    const cleanDomain = RegExp.$1
    if (cleanDomain.length > 255) {
      return false
    }

    // is domain an ipv4/6 or known hostname?
    if ((urlParser.validIP4Regex.test(cleanDomain) || (cleanDomain.startsWith('[') && cleanDomain.endsWith(']'))) ||
        hosts.includes(cleanDomain)) {
      return true
    }
    // it has a public suffix?
    return publicSuffixes.find(s => cleanDomain.endsWith(s)) !== undefined
  },
  isHTTPSUpgreadable: function (url) {
    // TODO: parse and remove all subdomains, only leaving parent domain and tld
    const domain = removeWWW(urlParser.getDomain(url)) // list has no subdomains

    return httpsTopSites.includes(domain)
  }
}

module.exports = urlParser
