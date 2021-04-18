const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const packageFile = require('./../package.json')
const version = packageFile.version
const platform = process.argv.find(arg => arg.match('platform')).split('=')[1]

function toTarget (platform) {
  switch (platform) {
    case 'x86':
      return 'darwinIntel'
    case 'arm64':
      return 'darwinArm'
  }
}

require('./createPackage.js')(toTarget(platform)).then(function (appPaths) {
  appPaths.forEach(function (packagePath) {
    /* create zip file */

    var output = fs.createWriteStream(packagePath.replace('Min-', 'Min-v' + version + '-') + '.zip')
    var archive = archiver('zip', {
      zlib: { level: 9 }
    })

    archive.directory(path.resolve(packagePath, 'Min.app'), 'Min.app')

    archive.pipe(output)
    archive.finalize()
  })
})
