module.exports = function (grunt) {

	var package = require("./package.json");
	var version = package.version,
		electronVersion = package.electronVersion;

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				separator: '\n;'
			},
			browser: {
				src: [
					"dist/localization.build.js",
					"js/default.js",
					"js/util/database.js",
					"js/util/defaultKeyMap.js",
					"js/util/settings.js",
					"js/util/searchEngine.js",
					"js/menuBarVisibility.js",
					"js/tabState.js",
					"js/util/urlParser.js",
					"js/filteringRenderer.js",
					"js/webviews.js",
					"js/webviewMenu.js",
					"js/bookmarksHistory/bookmarksHistory.js",
					"js/api-wrapper.js",
					"js/searchbar/searchbar.js",
					"js/searchbar/searchbar-plugins.js",
					"js/searchbar/searchbar-autocomplete.js",
					"js/searchbar/placesPlugin.js",
					"js/searchbar/instantAnswerPlugin.js",
					"js/searchbar/openTabsPlugin.js",
					"js/searchbar/bangsPlugin.js",
					"js/searchbar/customBangs.js",
					"js/searchbar/searchSuggestionsPlugin.js",
					"js/searchbar/placeSuggestionsPlugin.js",
					"js/searchbar/hostsSuggestionsPlugin.js",
					"js/readerview.js",
					"js/navbar/tabActivity.js",
					"js/navbar/tabColor.js",
					"js/navbar/navbarTabs.js",
					"js/taskOverlay/taskOverlay.js",
					"js/taskOverlay/taskOverlayBuilder.js",
					"js/navbar/addTabButton.js",
					"js/navbar/goBackButton.js",
					"js/navbar/goForwardButton.js",
					"js/keybindings.js",
					"js/fileDownloadManager.js",
					"js/findinpage.js",
					"js/sessionRestore.js",
					"js/tabRestore.js",
					"js/focusMode.js",
					"js/util/theme.js",
				],
				dest: 'dist/build.js'
			},
			webview: {
				src: [
					"js/webview/default.js",
					"js/webview/textExtractor.js",
					"js/webview/phishDetector.js",
					"js/webview/readerDetector.js",
					"js/webview/swipeEvents.js",
					"js/webview/zoom.js",
					"js/webview/keywordExtractor.js",
				],
				dest: 'dist/webview.js'
			},
			main: {
				src: [
					"dist/localization.build.js",
					"main/main.js",
					"main/filtering.js",
				],
				dest: 'main.build.js'
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= grunt.template.today("mm-dd-yyyy") %> */\n'
			},
			browser: {
				src: 'dist/build.js',
				dest: 'dist/build.min.js'
			},
			webview: {
				src: 'dist/webview.js',
				dest: 'dist/webview.min.js'
			},
		},
		watch: {
			scripts: {
				files: ['js/**/*.js', 'main/*.js'],
				tasks: ['default'],
				options: {
					spawn: false
				}
			},
		},
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
					icon: "icon.icns",
					ignore: 'dist/app',
					prune: true,
					overwrite: true,
					protocols: [{
						name: "HTTP link",
						schemes: ["http", "https"]
					}, {
						name: "File",
						schemes: ["file"]
					}],
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
					ignore: 'dist/app',
					prune: true,
					overwrite: true,
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
					ignore: 'dist/app',
					prune: true,
					overwrite: true,
				}
			}
		},
		'electron-installer-debian': {
			options: {
				productName: "Min",
				genericName: "Web Browser",
				version: version,
				section: "web",
				homepage: "https://palmeral.github.io/min/",
				icon: "icons/icon256.png",
				categories: ["Network", "WebBrowser"],
				mimeType: ["x-scheme-handler/http", "x-scheme-handler/https", "text/html"],
				maintainer: "Min Developers <280953907a@zoho.com>",
				description: "Min is a faster, smarter web browser.",
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
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-electron');
	grunt.loadNpmTasks('grunt-electron-installer-debian');
	grunt.loadNpmTasks('grunt-contrib-watch')

	grunt.registerTask('default', ['concat:browser', 'uglify:browser', 'concat:webview', 'uglify:webview', 'concat:main']);
	grunt.registerTask('browser', ['concat:browser', 'uglify:browser']);
	grunt.registerTask('webview', ['concat:webview', 'uglify:webview']);

	grunt.registerTask('macBuild', ['concat:browser', 'uglify:browser', 'concat:webview', 'uglify:webview', 'concat:main', 'electron:osxBuild'])
	grunt.registerTask('linuxBuild', ['concat:browser', 'uglify:browser', 'concat:webview', 'uglify:webview', 'concat:main', 'electron:linuxBuild', 'electron-installer-debian:linux32', 'electron-installer-debian:linux64'])
	grunt.registerTask('windowsBuild', ['concat:browser', 'uglify:browser', 'concat:webview', 'uglify:webview', 'concat:main', 'electron:windowsBuild'])
};
