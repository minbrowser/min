const chokidar = require('chokidar')
const path = require('path')

const mainDir = path.resolve(__dirname, '../main')
const jsDir = path.resolve(__dirname, '../js')
const preloadDir = path.resolve(__dirname, '../js/preload')

const buildMain = require('./buildMain.js')
const buildBrowser = require('./buildBrowser.js')
const buildPreload = require('./buildPreload.js')

// rebuild everything on startup
buildMain()
buildBrowser()
buildPreload()

chokidar.watch(mainDir).on('change', function () {
  console.log('rebuilding main')
  buildMain()
})

chokidar.watch(jsDir, {ignored: preloadDir}).on('change', function () {
  console.log('rebuilding browser')
  buildBrowser()
})

chokidar.watch(preloadDir).on('change', function () {
  console.log('rebuilding preload script')
  buildPreload()
})
