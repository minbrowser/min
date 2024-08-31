const builder = require('electron-builder')
const Platform = builder.Platform
const Arch = builder.Arch

const createPackage = require('./createPackage.js')

async function afterPackageBuilt (path, arch) {
  var installerOptions = {
    artifactName: 'min-${version}-${arch}.deb',
    packageName: 'min',
    icon: 'icons/icon256.png',
    category: 'Network;WebBrowser',
    packageCategory: 'Network',
    mimeTypes: ['x-scheme-handler/http', 'x-scheme-handler/https', 'text/html'],
    maintainer: 'Min Developers <280953907a@zoho.com>',
    description: 'Min is a fast, minimal browser that protects your privacy.',
    synopsis: 'A web browser with smarter search, improved tab management, and built-in ad blocking. Includes full-text history search, instant answers from DuckDuckGo, the ability to split tabs into groups, and more.',
    depends: [
      'libsecret-1-0',
      'libasound2',
      'libc6',
      'libcap2',
      'libgtk2.0-0',
      'libudev0 | libudev1',
      'libgcrypt11 | libgcrypt20',
      'libnotify4',
      'libnss3',
      'libxss1',
      'libxtst6',
      'python | python3',
      'xdg-utils'
    ],
    afterInstall: 'resources/postinst_script',
    afterRemove: 'resources/prerm_script'
  }

  console.log('Creating package (this may take a while)')

  const options = {
    linux: {
      target: ['deb']
    },
    directories: {
      buildResources: 'resources',
      output: 'dist/app/'
    },
    deb: installerOptions,
    publish: null
  }

  await builder.build({
    prepackaged: path,
    targets: Platform.LINUX.createTarget(['deb'], arch),
    config: options
  })
    .then(() => console.log('Successfully created package.'))
    .catch(err => {
      console.error(err, err.stack)
      process.exit(1)
    })
}

const arches = [Arch.x64, Arch.armv7l, Arch.arm64];

(async () => {
  for (const arch of arches) {
    await createPackage('linux', { arch: arch }).then(path => afterPackageBuilt(path, arch))
  }
})()
