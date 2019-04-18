const fs = require('fs')

const packageFile = require('./../package.json')
const version = packageFile.version

require('./createPackage.js')('win32').then(function (appPaths) {
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
