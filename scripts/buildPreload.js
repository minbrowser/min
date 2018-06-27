const path = require('path')
const fs = require('fs')

const outFile = path.resolve(__dirname, '../dist/preload.js')

const modules = [
  'js/webview/default.js',
  'js/webview/textExtractor.js',
  'js/webview/phishDetector.js',
  'js/webview/readerDetector.js',
  'js/webview/keywordExtractor.js',
  'js/webview/siteUnbreak.js'
]

function buildPreload () {
  /* concatenate modules */
  let output = ''
  modules.forEach(function (script) {
    output += fs.readFileSync(path.resolve(__dirname, '../', script)) + ';\n'
  })

  fs.writeFileSync(outFile, output, 'utf-8')
}

if (module.parent) {
  module.exports = buildPreload
} else {
  buildPreload()
}
