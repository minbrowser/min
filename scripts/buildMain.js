const webpack = require('webpack');
const path = require('path');

// First build localization
require('./buildLocalization.js')();

// Get webpack config
const webpackConfig = require('../webpack.config.js');

// Customize for main process bundle
const mainConfig = {
  ...webpackConfig,
  entry: {
    main: path.resolve(__dirname, '../main/main.js')
  },
  target: 'electron-main'
};

function buildMain() {
  return new Promise((resolve, reject) => {
    webpack(mainConfig, (err, stats) => {
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
  module.exports = buildMain;
} else {
  buildMain().catch(err => {
    console.error('Error building main process:', err);
    process.exit(1);
  });
}
