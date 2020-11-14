const packager = require('electron-packager')
const rebuild = require('electron-rebuild').default

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
  'localization/',
  // parts of modules that aren't needed
  'node_modules/@types/',
  'node_modules/pdfjs-dist/es5',
  'node_modules/pdfjs-dist/lib',
  /node_modules\/[^/\n]+\/test\//g
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
  overwrite: true,
  afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
    rebuild({ buildPath, electronVersion, arch })
      .then(() => callback())
      .catch((error) => callback(error))
  }]
}

var platformOptions = {
  darwin: {
    platform: 'darwin',
    arch: 'x64', // TODO enable ARM build
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
    arch: 'x64',
    platform: 'win32',
    icon: 'icons/icon256.ico'
  },
  linuxAmd64: {
    name: 'min', // name must be lowercase to run correctly after installation
    platform: 'linux',
    arch: 'x64'
  },
  raspi: {
    name: 'min', // name must be lowercase to run correctly after installation
    platform: 'linux',
    arch: 'armv7l',
    fpm: ['--architecture', 'armhf']
  },
  linuxArm64: {
    name: 'min', // name must be lowercase to run correctly after installation
    platform: 'linux',
    arch: 'arm64',
    fpm: ['--architecture', 'aarch64']
  }
}

module.exports = function (platform) {
  return packager(Object.assign({}, baseOptions, platformOptions[platform]))
}
