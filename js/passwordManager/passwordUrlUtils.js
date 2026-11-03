const ipaddr = require('ipaddr.js')

const PasswordUrlUtils = {
  urlSupportedForPasswordManagement: function (url) {
    const isSecureProtocol = ['https:', 'file:'].includes(url.protocol)

    const isLocalAddress =
  url.hostname === 'localhost' ||
  (ipaddr.isValid(url.hostname) && [
    'private',
    'loopback',
    'linkLocal',
    'uniqueLocal'
  ].includes(ipaddr.parse(url.hostname).range()))

    return isSecureProtocol || isLocalAddress
  },
  getSavedKeyForUrl: function (url) {
    const hostname = url.hostname
    if (hostname.startsWith('www.')) {
      return hostname.replace('www.', '')
    } else {
      return hostname
    }
  }
}

module.exports = PasswordUrlUtils
