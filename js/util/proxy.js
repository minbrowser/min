let proxyConfig = {}

settings.listen('proxy', (proxy = {}) => {
  switch (proxy.type) {
    case 1:
      proxyConfig = {
        pacScript: '',
        proxyRules: proxy.proxyRules,
        proxyBypassRules: proxy.proxyBypassRules
      }
      break
    case 2:
      proxyConfig.pacScript = proxy.pacScript
      break
    default:
      proxyConfig = {}
  }

  webContents.getAllWebContents().forEach(wc => wc.session && wc.session.setProxy(proxyConfig))
})

app.on('session-created', session => session.setProxy(proxyConfig))
