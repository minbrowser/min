const webpack = require('webpack');
const path = require('path');
const webpackConfig = require('../webpack.config.js');

// Get individual build functions
const buildMain = require('./buildMain.js');
const buildBrowser = require('./buildBrowser.js');
const buildPreload = require('./buildPreload.js');
const buildBrowserStyles = require('./buildBrowserStyles.js');

// Create webpack compiler instances
const mainConfig = {
  ...webpackConfig,
  entry: {
    main: path.resolve(__dirname, '../main/main.js')
  },
  target: 'electron-main',
  watch: true
};

const browserConfig = {
  ...webpackConfig,
  entry: {
    browser: path.resolve(__dirname, '../js/default.js')
  },
  watch: true
};

const preloadConfig = {
  ...webpackConfig,
  entry: {
    preload: path.resolve(__dirname, '../js/preload/default.js')
  },
  target: 'electron-preload',
  watch: true
};

// Start watching
console.log('Starting webpack in watch mode...');

// Build localization first (not watched)
require('./buildLocalization.js')();

// Start watchers
const mainCompiler = webpack(mainConfig);
const browserCompiler = webpack(browserConfig);
const preloadCompiler = webpack(preloadConfig);

// Watch for main process changes
mainCompiler.watch({}, (err, stats) => {
  if (err) {
    console.error('Error watching main:', err);
    return;
  }
  console.log('Main process rebuilt');
});

// Watch for browser changes
browserCompiler.watch({}, (err, stats) => {
  if (err) {
    console.error('Error watching browser:', err);
    return;
  }
  console.log('Browser rebuilt');
});

// Watch for preload changes
preloadCompiler.watch({}, (err, stats) => {
  if (err) {
    console.error('Error watching preload:', err);
    return;
  }
  console.log('Preload script rebuilt');
});

// Watch CSS files separately
const chokidar = require('chokidar');
const browserStylesDir = path.resolve(__dirname, '../css');

chokidar.watch(browserStylesDir).on('change', function () {
  console.log('rebuilding browser styles');
  buildBrowserStyles();
});
