const { pathToFileURL } = require('url')

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
  ses.protocol.handle('min', (req) => {
    let { host, pathname } = new URL(req.url)

    if (pathname.charAt(0) === '/') {
      pathname = pathname.substring(1)
    }

    if (host !== 'app' && host !== 'newtab' && host !== 'blank') {
      return new Response('bad', {
        status: 400,
        headers: { 'content-type': 'text/html' }
      })
    }

    // Handle newtab:// protocol
    if (host === 'newtab') {
      const newtabPath = path.resolve(__dirname, '../pages/newtab/index.html')
      return net.fetch(pathToFileURL(newtabPath).toString())
    }

    // Handle blank:// protocol
    if (host === 'blank') {
      const blankPath = path.resolve(__dirname, '../pages/blank/index.html')
      return net.fetch(pathToFileURL(blankPath).toString())
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

    return net.fetch(pathToFileURL(pathToServe).toString())
  })
}

app.on('session-created', (ses) => {
  if (ses !== session.defaultSession) {
    registerBundleProtocol(ses)
  }
})
