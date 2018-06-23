module.exports = function (grunt) {
  const packageFile = require('./package.json')
  const version = packageFile.version
  const electronVersion = packageFile.electronVersion

  const ignoredDirs = ['.DS_Store', 'dist/app', 'ext/readability-master/test', /\.map$/g, /\.md$/g] // directories that will be ignored when building binaries

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    electron: {
      osxBuild: {
        options: {
          name: 'Min',
          dir: __dirname,
          out: 'dist/app',
          version: electronVersion,
          'app-version': version,
          platform: 'darwin',
          arch: 'x64',
          icon: 'icon.icns',
          ignore: ignoredDirs,
          prune: true,
          overwrite: true,
          protocols: [{
            name: 'HTTP link',
            schemes: ['http', 'https']
          }, {
            name: 'File',
            schemes: ['file']
          }]
        }
      },
      windowsBuild: {
        options: {
          name: 'Min',
          dir: __dirname,
          out: 'dist/app',
          version: electronVersion,
          'app-version': version,
          platform: 'win32',
          arch: 'all',
          icon: 'icons/icon256.ico',
          ignore: ignoredDirs,
          prune: true,
          overwrite: true
        }
      },
      linuxBuild: {
        options: {
          name: 'min',
          dir: __dirname,
          out: 'dist/app',
          version: electronVersion,
          'app-version': version,
          platform: 'linux',
          arch: 'all',
          ignore: ignoredDirs,
          prune: true,
          overwrite: true
        }
      }
    },
    'electron-installer-debian': {
      options: {
        productName: 'Min',
        genericName: 'Web Browser',
        version: version,
        section: 'web',
        homepage: 'https://palmeral.github.io/min/',
        icon: 'icons/icon256.png',
        categories: ['Network', 'WebBrowser'],
        mimeType: ['x-scheme-handler/http', 'x-scheme-handler/https', 'text/html'],
        maintainer: 'Min Developers <280953907a@zoho.com>',
        description: 'Min is a faster, smarter web browser.',
        productDescription: 'A web browser with smarter search, improved tab management, and built-in ad blocking. Includes full-text history search, instant answers from DuckDuckGo, the ability to split tabs into groups, and more.',
        depends: [
          'gconf2',
          'gconf-service',
          'gvfs-bin',
          'libc6',
          'libcap2',
          'libgtk2.0-0',
          'libudev0 | libudev1',
          'libgcrypt11 | libgcrypt20',
          'libnotify4',
          'libnss3',
          'libxtst6',
          'python',
          'xdg-utils'
        ]
      },
      linux32: {
        options: {
          arch: 'i386'
        },
        src: 'dist/app/min-linux-ia32',
        dest: 'dist/app/linux'
      },
      linux64: {
        options: {
          arch: 'amd64'
        },
        src: 'dist/app/min-linux-x64',
        dest: 'dist/app/linux'
      }
    },
    // https://stackoverflow.com/a/47304117/865175
    run: {
      buildMain: {
        exec: 'npm run buildMain --silent'
      },
      buildBrowser: {
        exec: 'npm run buildBrowser --silent'
      },
      buildPreload: {
        exec: 'npm run buildPreload --silent'
      }
    }
  })

  grunt.loadNpmTasks('grunt-electron')
  grunt.loadNpmTasks('grunt-electron-installer-debian')
  grunt.loadNpmTasks('grunt-run')

  grunt.registerTask('default', ['run:buildBrowser', 'run:buildPreload', 'run:buildMain'])

  grunt.registerTask('macBuild', ['default', 'electron:osxBuild'])
  grunt.registerTask('linuxBuild', ['default', 'electron:linuxBuild', 'electron-installer-debian:linux32', 'electron-installer-debian:linux64'])
  grunt.registerTask('windowsBuild', ['default', 'electron:windowsBuild'])
}
