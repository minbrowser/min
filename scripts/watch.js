const chokidar = require('chokidar')
const path = require('path')

const jsDir = path.resolve(__dirname, '../js')
const mainDir = path.resolve(__dirname, '../main')

const buildBrowser = require('./buildBrowser.js')

chokidar.watch([jsDir, mainDir]).on('change', function () {
  console.log('rebuilding browser')
  buildBrowser()
})
