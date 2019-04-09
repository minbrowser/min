const path = require('path')

const installer = require('electron-installer-windows')

const options = {
  src: 'dist/app/min-win32-x64',
  dest: 'dist/app/min-installer-x64',
  icon: 'icons/icon256.ico',
  animation: 'icons/windows-installer.gif',
  licenseUrl: 'https://github.com/minbrowser/min/blob/master/LICENSE.txt',
  noMsi: true
}

console.log('Creating package (this may take a while)')

installer(options)
  .then(() => console.log(`Successfully created package at ${options.dest}`))
  .catch(err => {
    console.error(err, err.stack)
    process.exit(1)
  })
