const fs = require('fs')
const archiver = require('archiver')

const packageFile = require('./../package.json')
const version = packageFile.version

require('./createPackage.js')('win32').then(function (appPaths) {

  /* create zip files */

  appPaths.forEach(function (packagePath) {
    var output = fs.createWriteStream(packagePath.replace('Min-', 'Min-v' + version + '-') + '.zip')
    var archive = archiver('zip', {
      zlib: { level: 9 }
    })
    archive.directory(packagePath, 'Min-v' + version)
    archive.pipe(output)
    archive.finalize()
  })

  /* create installer */
  const installer = require('electron-installer-windows')

  const options = {
    src: appPaths.filter(p => p.includes('x64'))[0],
    dest: 'dist/app/min-installer-x64',
    icon: 'icons/icon256.ico',
    animation: 'icons/windows-installer.gif',
    licenseUrl: 'https://github.com/minbrowser/min/blob/master/LICENSE.txt',
    noMsi: true
  }

  console.log('Creating package (this may take a while)')

  installer(options)
    .then(function () {
      fs.renameSync('./dist/app/min-installer-x64/min-' + version + '-setup.exe', './dist/app/min-' + version + '-setup.exe')
    })
    .catch(err => {
      console.error(err, err.stack)
      process.exit(1)
    })
})
