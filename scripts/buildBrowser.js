const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

// First build localization
require('./buildLocalization.js')();

// Get webpack config
const webpackConfig = require('../webpack.config.js');

// Customize for browser bundle
const browserConfig = {
  ...webpackConfig,
  entry: {
    browser: path.resolve(__dirname, '../js/default.js')
  },
  plugins: [
    // Add localization as a global variable
    new webpack.BannerPlugin({
      banner: fs.readFileSync(path.resolve(__dirname, '../dist/localization.build.js'), 'utf8'),
      raw: true
    })
  ]
};

function buildBrowser() {
  return new Promise((resolve, reject) => {
    webpack(browserConfig, (err, stats) => {
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
  module.exports = buildBrowser;
} else {
  buildBrowser().catch(err => {
    console.error('Error building browser:', err);
    process.exit(1);
  });
}
