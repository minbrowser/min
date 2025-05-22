const path = require('path');

module.exports = {
  entry: {
    browser: './js/default.js',
    preload: './js/preload/default.js',
    main: './main/main.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    modules: [
      path.resolve(__dirname),
      path.resolve(__dirname, 'js'),
      'node_modules'
    ]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: ['file-loader']
      }
    ]
  },
  target: 'electron-renderer',
  node: {
    __dirname: false,
    __filename: false
  },
  externals: {
    'chokidar': 'commonjs chokidar',
    'write-file-atomic': 'commonjs write-file-atomic'
  }
};