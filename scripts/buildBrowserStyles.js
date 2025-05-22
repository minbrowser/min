const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const glob = require('glob');

// Get webpack config
const webpackConfig = require('../webpack.config.js');

// CSS files to include
const cssFiles = [
  'css/base.css',
  'css/windowControls.css',
  'css/modal.css',
  'css/tabBar.css',
  'css/tabEditor.css',
  'css/taskOverlay.css',
  'css/webviews.css',
  'css/newTabPage.css',
  'css/searchbar.css',
  'css/listItem.css',
  'css/bookmarkManager.css',
  'css/findinpage.css',
  'css/downloadManager.css',
  'css/passwordManager.css',
  'css/passwordCapture.css',
  'css/passwordViewer.css',
  'node_modules/dragula/dist/dragula.min.css'
];

// Create an entry point that imports all CSS files
const entryContent = cssFiles.map(file => `import '../${file}';`).join('\n');
const entryPath = path.resolve(__dirname, '../dist/css-entry.js');
require('fs').writeFileSync(entryPath, entryContent);

// Paths for PurgeCSS
const PATHS = {
  src: path.join(__dirname, '../js'),
  html: path.join(__dirname, '../index.html')
};

// Customize for CSS bundle
const cssConfig = {
  ...webpackConfig,
  entry: {
    styles: entryPath
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'bundle.css'
    }),
    new PurgeCSSPlugin({
      paths: glob.sync(`${PATHS.src}/**/*`, { nodir: true }).concat(PATHS.html),
      safelist: {
        standard: [/^dragula/, /^sortable/, /^password/, /^tab/, /^modal/, /^bi/]
      }
    })
  ]
};

function buildBrowserStyles() {
  return new Promise((resolve, reject) => {
    webpack(cssConfig, (err, stats) => {
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
  module.exports = buildBrowserStyles;
} else {
  buildBrowserStyles().catch(err => {
    console.error('Error building browser styles:', err);
    process.exit(1);
  });
}
