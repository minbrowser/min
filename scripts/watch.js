const chokidar = require('chokidar')
const path = require('path')

const jsDir = path.resolve(__dirname, '../js')
const mainDir = path.resolve(__dirname, '../main')
const preloadDir = path.resolve(__dirname, '../js/webview')

const buildBrowser = require('./buildBrowser.js')
const buildPreload = require('./buildPreload.js')

chokidar.watch([jsDir, mainDir], {ignored: preloadDir}).on('change', function () {
  console.log('rebuilding browser')
  buildBrowser()
})

chokidar.watch(preloadDir).on('change', function () {
  console.log('rebuilding preload script')
  buildPreload()
})
