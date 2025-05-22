const webpack = require('webpack');
const path = require('path');

// Get webpack config
const webpackConfig = require('../webpack.config.js');

// Customize for preload bundle
const preloadConfig = {
  ...webpackConfig,
  entry: {
    preload: path.resolve(__dirname, '../js/preload/default.js')
  },
  target: 'electron-preload'
};

function buildPreload() {
  return new Promise((resolve, reject) => {
    webpack(preloadConfig, (err, stats) => {
      if (err || stats.hasErrors()) {
        console.error('Build failed:');
        if (err) {
          console.error(err);
        }
        if (stats && stats.hasErrors()) {
          console.error(stats.toString({
            colors: true,
            errors: true,
            errorDetails: true
          }));
        }
        reject(err || new Error('Webpack compilation failed'));
        return;
      }
      
      console.log(stats.toString({
        colors: true,
        modules: false,
        chunks: false
      }));
      
      resolve();
    });
  });
}

if (module.parent) {
  module.exports = buildPreload;
} else {
  buildPreload().catch(err => {
    console.error('Error building preload:', err);
    process.exit(1);
  });
}
