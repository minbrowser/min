const builder = require('electron-builder')
const packageFile = require('./../package.json')
const version = packageFile.version
const Platform = builder.Platform
const Arch = builder.Arch

require('./createPackage.js')('linux', {arch: Arch.x64}).then(function (path) {
  const options = {
    linux: {
      target: ['AppImage'],
      icon: 'icons/icon256.png',
      category: 'Network',
      packageCategory: 'Network',
      mimeTypes: ['x-scheme-handler/http', 'x-scheme-handler/https', 'text/html'],
      synopsis: 'Min is a fast, minimal browser that protects your privacy.',
      description: 'A web browser with smarter search, improved tab management, and built-in ad blocking. Includes full-text history search, instant answers from DuckDuckGo, the ability to split tabs into groups, and more.',
      maintainer: 'Min Developers <280953907a@zoho.com>',
    },
    directories: {
      output: 'dist/app/'
    },
  }

  builder.build({
    prepackaged: path,
    targets: Platform.LINUX.createTarget(['AppImage'], Arch.x64),
    config: options
  })
})
