const { pathToFileURL } = require('url')

const defaultCSP = "script-src 'self'; style-src 'self'; object-src 'none'; form-action 'self';"

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'min',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    }
  }
])

function registerBundleProtocol (ses) {
  ses.protocol.handle('min', async (req) => {
    let { host, pathname } = new URL(req.url)

    if (pathname.charAt(0) === '/') {
      pathname = pathname.substring(1)
    }

    if (host !== 'app') {
      return new Response('bad', {
        status: 400,
        headers: { 'content-type': 'text/html' }
      })
    }

    // NB, this checks for paths that escape the bundle, e.g.
    // app://bundle/../../secret_file.txt
    const pathToServe = path.resolve(__dirname, pathname)
    const relativePath = path.relative(__dirname, pathToServe)
    const isSafe = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)

    if (!isSafe) {
      return new Response('bad', {
        status: 400,
        headers: { 'content-type': 'text/html' }
      })
    }

    const response = await net.fetch(pathToFileURL(pathToServe).toString())

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-security-policy': defaultCSP
      }
    })
  })
}

app.on('session-created', (ses) => {
  if (ses !== session.defaultSession) {
    registerBundleProtocol(ses)
  }
})
