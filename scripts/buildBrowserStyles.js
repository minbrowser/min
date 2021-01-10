const path = require('path')
const fs = require('fs')

const outFile = path.resolve(__dirname, '../dist/bundle.css')

const modules = [
  'css/base.css',
  'css/windowControls.css',
  'css/modal.css',
  'css/tabBar.css',
  'css/tabEditor.css',
  'css/taskOverlay.css',
  'css/webviews.css',
  'css/searchbar.css',
  'css/listItem.css',
  'css/bookmarkManager.css',
  'css/findinpage.css',
  'css/downloadManager.css',
  'css/passwordManager.css',
  'css/passwordCapture.css',
  'css/passwordViewer.css',
  'node_modules/dragula/dist/dragula.min.css'
]

function buildBrowserStyles () {
  /* concatenate modules */
  let output = ''
  modules.forEach(function (script) {
    output += fs.readFileSync(path.resolve(__dirname, '../', script)) + '\n'
  })

  fs.writeFileSync(outFile, output, 'utf-8')
}

if (module.parent) {
  module.exports = buildBrowserStyles
} else {
  buildBrowserStyles()
}
