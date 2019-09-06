if (typeof require !== 'undefined') {
  var settings = require('util/settings/settings.js')
}
const { BrowserWindow } = require('electron')
const { session } = require('electron')

var proxy = {
  rules: {
    proxyRules: "",
    proxyBypassRules: "localhost"
  },
  initialize: function () {
    settings.listen("proxyMode", function(value){
      if (value == 'no-proxy') {
        proxy.rules.proxyRules = ""
        proxy.changeHandler()
      }
      else {
        var proxyRules = new Array();
        settings.listen('proxies', function(proxy){
          if ( proxy.httpHost ) {
            var proxyString
            if ( !(proxy.httpPort == 0) )
              proxyString = "http://" + proxy.httpHost + ":" + proxy.httpPort
            else
              proxyString = "http://" + proxy.httpHost
            proxyRules.push(proxyString)
          }
          if ( proxy.sslHost ) {
            var proxyString
            if ( !(proxy.sslPort == 0) )
              proxyString = "https://" + proxy.sslHost + ":" + proxy.sslPort
            else
              proxyString = "https://" + proxy.sslHost
            proxyRules.push(proxyString)
          }
          if ( proxy.ftpHost ) {
            var proxyString
            if ( !(proxy.ftpPort == 0) )
              proxyString = "http://" + proxy.ftpHost + ":" + proxy.ftpPort
            else
              proxyString = "http://" + proxy.ftpHost
            proxyRules.push(proxyString)
          }
          if ( proxy.socksHost ) {
            var proxyString
            if( proxy.socksMode == "socks4" ) {
              proxyString = "socks4://"
            }
            else {
              proxyString = "socks5://"
            }

            if ( !(proxy.socksPort == 0) )
              proxyString += proxy.socksHost + ":" + proxy.socksPort
            else
              proxyString += proxy.socksHost
            proxyRules.push(proxyString)
          }
        })
        console.log(proxyRules)
      }
    })
  },
  changeHandler: function() {
    // window.dispatchEvent(new CustomEvent("proxy-change", {
    //   detail: rules
    // }))
  }
}

if (require.main === module) {
  proxy.initialize()
} else {
  module.exports = proxy
}
