const browserify = require('browserify')
const renderify = require('electron-renderify')
const path = require('path')
const fs = require('fs')

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
  'js/util/relativeDate.js',
  'js/menuBarVisibility.js',
  'js/tabState.js',
  'js/util/urlParser.js',
  'js/filteringRenderer.js',
  'js/webviews.js',
  'js/phishingWarning.js',
  'js/webviewMenu.js',
  'js/bookmarksHistory/bookmarksHistory.js',
  'js/api-wrapper.js',
  'js/searchbar/searchbar.js',
  'js/searchbar/searchbar-plugins.js',
  'js/searchbar/searchbar-autocomplete.js',
  'js/searchbar/placesPlugin.js',
  'js/searchbar/instantAnswerPlugin.js',
  'js/searchbar/openTabsPlugin.js',
  'js/searchbar/bangsPlugin.js',
  'js/searchbar/customBangs.js',
  'js/searchbar/searchSuggestionsPlugin.js',
  'js/searchbar/placeSuggestionsPlugin.js',
  'js/searchbar/hostsSuggestionsPlugin.js',
  'js/readerview.js',
  'js/navbar/tabActivity.js',
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
  'js/tabRestore.js',
  'js/focusMode.js',
  'js/util/theme.js',
  'js/webviewGestures.js'
]

/* concatenate legacy modules */
let output = ''
legacyModules.forEach(function (script) {
  output += fs.readFileSync(path.resolve(__dirname, '../', script)) + ';\n'
})

fs.writeFileSync(intermediateOutput, output, 'utf-8')

let instance = browserify(intermediateOutput, {
  ignoreMissing: true,
  node: true,
  detectGlobals: false
})

instance.transform(renderify)
let stream = fs.createWriteStream(outFile, {encoding: 'utf-8'})
instance.bundle().pipe(stream)
