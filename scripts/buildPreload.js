const path = require('path')
const fs = require('fs')

const outFile = path.resolve(__dirname, '../dist/preload.js')

const modules = [
  'js/preload/default.js',
  'js/preload/textExtractor.js',
  'js/preload/readerDetector.js',
  'js/preload/siteUnbreak.js',
  'js/util/settings/settingsPreload.js',
  'js/preload/passwordFill.js',
  'ext/text-fragments-polyfill/text-fragment-utils.js',
  'ext/text-fragments-polyfill/fragment-generation-utils.js',
  'js/preload/highlighting.js'
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
