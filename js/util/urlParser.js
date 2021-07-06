const punycode = require('punycode')

const searchEngine = require('util/searchEngine.js')
const hosts = require('./hosts.js')
const httpsTopSites = require('../../ext/httpsUpgrade/httpsTopSites.json')
const publicSuffixes = require('../../ext/publicSuffixes/public_suffix_list.json')

// fletcher32 checksum
function checksum (str) {
  var s1 = 0
  var s2 = 0
  for (var i = 0; i < str.length; ++i) {
    s1 = (s1 + str.charCodeAt(i)) % 0xffffff
    s2 = (s1 + s1) % 0xffffff
  }
  return ((s2 << 16) | s1)
}

function removeWWW (domain) {
  return domain.replace(/^www\./i, '')
}

var urlParser = {
  validDomains: [], // valid domains checksum cache
  validIP4Regex: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/i,
  validDomainRegex: /^(?!-)(?:.*@)*?([a-z0-9-._]+[a-z0-9]|\[[:a-f0-9]+\])(?::[0-9]*|\.{1}){0,1}$/i,
  trailingSlashRegex: /\/$/g,
  removeProtocolRegex: /^(https?|file):\/\//i,
  protocolRegex: /^[a-z0-9]+:\/\//, // URI schemes can be alphanum
  isURL: function (url) {
    return urlParser.protocolRegex.test(url) || url.indexOf('about:') === 0 || url.indexOf('chrome:') === 0 || url.indexOf('data:') === 0
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
        var path = urlObj.pathname.replace('//', '')
        if (/^[a-zA-Z]+$/.test(path)) {
          // only paths with letters are allowed
          return urlParser.getFileURL(__dirname + '/pages/' + path + '/index.html' + urlObj.search)
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
    return removeWWW(urlParser.removeProtocol(url).replace(urlParser.trailingSlashRegex, ''))
  },
  prettyURL: function (url) {
    try {
      var urlOBJ = new URL(url)
      return removeWWW((urlOBJ.hostname + urlOBJ.pathname)).replace(urlParser.trailingSlashRegex, '')
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
    const trail = url.indexOf('/')
    return url.substr(0, trail > 0 ? trail : url.length).toLowerCase()
  },
  // primitive domain validation based on RFC1034
  validateDomain: function (domain) {
    domain = /[^\u0000-\u00ff]/.test(domain)
      ? punycode.toASCII(domain)
      : domain // only call punycode if necesary

    /*
      Tests for regex:
      ^^^^^^^^^^^^^^^
        google.com              = true
        google.com.br           = true
        -google.com             = false
        google-is-bad.com.ar    = true
        google.com.             = true
        google.com-             = false
        admin:1234@google.com   = true (ignores user:pass)
        xn--bcher-kva.example   = true
        127.0.0.1               = true
        169.254.169.254:8080    = true
        google.com..            = false
        [:::1]:8080             = true
        [2001:0db8::0001:0000]  = true
        [invalid]               = false
        localhost               = true
    */
    if (!(urlParser.validDomainRegex.test(domain) || domain.length > 255)) {
      return false
    }
    const cleanDomain = RegExp.$1
    const domainChecksum = checksum(cleanDomain)

    if (urlParser.validDomains.length > 0 && urlParser.validDomains.includes(domainChecksum)) { // already validated
      return true
    }

    // is domain an ipv4/6, a known hostname or has a public suffix?
    if (((cleanDomain.split('.').length === 4 && urlParser.validIP4Regex.test(cleanDomain)) || (cleanDomain.startsWith('[') && cleanDomain.endsWith(']'))) ||
        hosts.includes(cleanDomain) ||
        publicSuffixes.find(suffix => cleanDomain.endsWith(suffix)) !== undefined) {
      urlParser.validDomains.push(domainChecksum)
      return true
    }

    return false
  },
  isHTTPSUpgreadable: function (url) {
    // TODO: parse and remove all subdomains, only leaving parent domain and tld
    const domain = removeWWW(urlParser.getDomain(url)) // list has no subdomains

    return httpsTopSites.includes(domain)
  }
}

module.exports = urlParser
