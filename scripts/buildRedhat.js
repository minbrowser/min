const packageFile = require('./../package.json')
const version = packageFile.version
const builder = require('electron-builder')
const Platform = builder.Platform
const Arch = builder.Arch

function toArch (platform) {
  switch (platform) {
    case 'amd64':
      return Arch.x64
    case 'armhf':
      return Arch.armv71
    case 'arm64':
      return Arch.arm64
    default:
      return Arch.universal
  }
}
require('./createPackage.js')('linux', { arch: Arch.x64 }).then(function (path) {
  var installerOptions = {
    artifactName: 'min-${version}-${arch}.rpm',
    packageName: 'Min',
    icon: 'icons/icon256.png',
    category: 'Network',
    packageCategory: 'Network',
    mimeTypes: ['x-scheme-handler/http', 'x-scheme-handler/https', 'text/html'],
    maintainer: 'Min Developers <280953907a@zoho.com>',
    synopsis: 'Min is a fast, minimal browser that protects your privacy.',
    description: 'A web browser with smarter search, improved tab management, and built-in ad blocking. Includes full-text history search, instant answers from DuckDuckGo, the ability to split tabs into groups, and more.'
  }

  console.log('Creating package (this may take a while)')

  const options = {
    linux: {
      target: ['rpm']
    },
    directories: {
      output: 'dist/app/'
    },
    rpm: installerOptions
  }

  builder.build({
    prepackaged: path,
    targets: Platform.LINUX.createTarget(['rpm'], Arch.x64),
    config: options
  })
    .then(() => console.log('Successfully created package.'))
    .catch(err => {
      console.error(err, err.stack)
      process.exit(1)
    })
})
