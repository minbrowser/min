const browserify = require('browserify')
const renderify = require('electron-renderify')
const path = require('path')
const fs = require('fs')

const rootDir = path.resolve(__dirname, '../js')

const intermediateOutput = path.resolve(__dirname, '../dist/build.js')
const outFile = path.resolve(__dirname, '../dist/bundle.js')

/* avoid adding modules to this list, require() them from the correct place instead */
const legacyModules = [
  'dist/localization.build.js',
  'js/default.js',
  'js/windowsCaptionButtons.js',
  'js/util/database.js',
  'js/util/defaultKeyMap.js',
  'js/util/settings.js',
  'js/util/searchEngine.js',
  'js/tabState.js',
  'js/util/urlParser.js',
  'js/filteringRenderer.js',
  'js/webviews.js',
  'js/phishingWarning.js',
  'js/webviewMenu.js',
  'js/bookmarksHistory/bookmarksHistory.js',
  'js/searchbar/placesPlugin.js',
  'js/searchbar/instantAnswerPlugin.js',
  'js/searchbar/openTabsPlugin.js',
  'js/searchbar/bangsPlugin.js',
  'js/searchbar/customBangs.js',
  'js/searchbar/searchSuggestionsPlugin.js',
  'js/searchbar/placeSuggestionsPlugin.js',
  'js/searchbar/hostsSuggestionsPlugin.js',
  'js/readerview.js',
  'js/navbar/tabColor.js',
  'js/navbar/tabBar.js',
  'js/taskOverlay/taskOverlay.js',
  'js/taskOverlay/taskOverlayBuilder.js',
  'js/navbar/addTabButton.js',
  'js/navbar/goBackButton.js',
  'js/navbar/menuButton.js',
  'js/keybindings.js',
  'js/pdfViewer.js',
  'js/findinpage.js',
  'js/userscripts.js',
  'js/sessionRestore.js',
  'js/util/theme.js',
  'js/webviewGestures.js'
]

function buildBrowser () {

  // build localization support first, since it is included in the browser bundle
  require('./buildLocalization.js')()

  /* concatenate legacy modules */
  let output = ''
  legacyModules.forEach(function (script) {
    output += fs.readFileSync(path.resolve(__dirname, '../', script)) + ';\n'
  })

  fs.writeFileSync(intermediateOutput, output, 'utf-8')

  let instance = browserify(intermediateOutput, {
    paths: [rootDir],
    ignoreMissing: false,
    node: true,
    detectGlobals: false
  })

  instance.transform(renderify)
  let stream = fs.createWriteStream(outFile, {encoding: 'utf-8'})
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
