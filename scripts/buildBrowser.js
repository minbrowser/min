const browserify = require('browserify')
const renderify = require('electron-renderify')
const path = require('path')
const fs = require('fs')

const rootDir = path.resolve(__dirname, '../')
const jsDir = path.resolve(__dirname, '../js')

const intermediateOutput = path.resolve(__dirname, '../dist/build.js')
const outFile = path.resolve(__dirname, '../dist/bundle.js')

const fileList = [
  'dist/localization.build.js',
  'js/default.js'
]

function buildBrowser () {
  // build localization support first, since it is included in the browser bundle
  require('./buildLocalization.js')()

  /* concatenate legacy modules */
  let output = ''
  fileList.forEach(function (script) {
    output += fs.readFileSync(path.resolve(__dirname, '../', script)) + ';\n'
  })

  fs.writeFileSync(intermediateOutput, output, 'utf-8')

  const instance = browserify(intermediateOutput, {
    paths: [rootDir, jsDir],
    ignoreMissing: false,
    node: true,
    detectGlobals: false
  })

  instance.transform(renderify)
  const stream = fs.createWriteStream(outFile, { encoding: 'utf-8' })
  instance.bundle()
    .on('error', function (e) {
      console.warn('\x1b[31m' + 'Error while building: ' + e.message + '\x1b[30m')
    })
    .pipe(stream)
}

if (module.parent) {
  module.exports = buildBrowser
} else {
  buildBrowser()
}
