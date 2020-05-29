const packager = require('electron-packager')

const packageFile = require('./../package.json')
const version = packageFile.version
const electronVersion = packageFile.electronVersion

const basedir = require('path').join(__dirname, '../')

// directories that will be ignored when building binaries
const ignoredDirs = [
  '.DS_Store',
  'dist/app',
  /\.map$/g,
  /\.md$/g,
  // electron-installer-debian is actually a development module, but it isn't pruned because it's optional
  'node_modules/electron-installer-debian',
  'node_modules/electron-installer-common',
  'node_modules/electron-installer-redhat',
  'icons/source',
  // this is copied during the build
  'icons/icon.icns',
  // localization files are compiled and copied to dist
  'localization/'
]

var baseOptions = {
  name: 'Min',
  dir: basedir,
  out: 'dist/app',
  electronVersion: electronVersion,
  appVersion: version,
  arch: 'all',
  ignore: ignoredDirs,
  prune: true,
  overwrite: true
}

var platformOptions = {
  darwin: {
    platform: 'darwin',
    icon: 'icons/icon.icns',
    darwinDarkModeSupport: true,
    protocols: [{
      name: 'HTTP link',
      schemes: ['http', 'https']
    }, {
      name: 'File',
      schemes: ['file']
    }]
  },
  win32: {
    platform: 'win32',
    icon: 'icons/icon256.ico'
  },
  linux: {
    name: 'min', // name must be lowercase to run correctly after installation
    platform: 'linux',
    arch: 'x64'
  },
  raspi: {
    name: 'min', // name must be lowercase to run correctly after installation
    platform: 'linux',
    arch: 'armv7l',
    fpm: ['--architecture', 'armhf']
  }
}

module.exports = function (platform) {
  return packager(Object.assign({}, baseOptions, platformOptions[platform]))
}
