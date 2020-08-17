let proxyConfig = {}

const generateProxyRules = pxs => {
  let rules = []

  Object.keys(pxs).forEach(key => {
    let ptcl = key.replace(/Host|Port/, '')
    let port = key.replace('Host', 'Port')

    if (pxs[key] && key.endsWith('Host')) {
      rules.push(`${ptcl == 'socks' ? pxs.socksVersion || 'socks5' : ptcl}://${pxs[key]}${pxs[port] ? ':' + pxs[port] : ''}`)
    }
  })

  return rules.join(';')
}

settings.listen('proxy', (proxy = {}) => {
  switch (proxy.type) {
    case 1:
      if (proxy.proxies) {
        proxyConfig = {
          pacScript: '',
          proxyRules: generateProxyRules(proxy.proxies),
          proxyBypassRules: proxy.proxyBypassRules
        }
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
