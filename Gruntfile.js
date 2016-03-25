module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				separator: ';'
			},
			browser: {
				src: [
						"js/default.js",
						"js/util/database.js",
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
							"js/searchbar/historyPlugin.js",
							"js/searchbar/instantAnswerPlugin.js",
							"js/searchbar/bookmarksPlugin.js",
							"js/searchbar/openTabsPlugin.js",
							"js/searchbar/searchSuggestionsPlugin.js",
							"js/searchbar/historySuggestionsPlugin.js",
							"js/readerView.js",
						 "js/navbar/tabActivity.js",
							"js/navbar/tabcolor.js",
						 "js/navbar/navbarTabs.js",
							"js/navbar/expandedTabMode.js",
							"js/navbar/addTabButton.js",
						 "js/keybindings.js",
						 "js/fileDownloadManager.js",
						 "js/findinpage.js",
							"js/sessionRestore.js",
							"js/focusMode.js",

						 ],
				dest: 'dist/build.js'
			},
			webview: {
				src: [
						"js/webview/default.js",
						"js/webview/bookmarksExtractor.js",
						"js/webview/contextMenu.js",
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
		electron: {
			osxBuild: {
				options: {
					name: 'Min',
					dir: '',
					out: 'dist/app',
					version: '0.36.8',
					'app-version': '1.0.1',
					platform: 'darwin',
					arch: 'x64',
					icon: "icon.icns",
					ignore: 'dist/app',
				}
			},
			windowsBuild: {
				options: {
					name: 'Min',
					dir: '',
					out: 'dist/app',
					version: '0.36.8',
					'app-version': '1.0.1',
					platform: 'win32',
					arch: 'all',
					ignore: 'dist/app',
				}
			},
			linuxBuild: {
				options: {
					name: 'Min',
					dir: '',
					out: 'dist/app',
					version: '0.36.8',
					'app-version': '1.0.1',
					platform: 'linux',
					arch: 'all',
					ignore: 'dist/app',
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-electron');

	grunt.registerTask('default', ['concat:browser', 'uglify:browser', 'concat:webview', 'uglify:webview', 'concat:main']);
	grunt.registerTask('browser', ['concat:browser', 'uglify:browser']);
	grunt.registerTask('webview', ['concat:webview', 'uglify:webview']);
	grunt.registerTask('build', ['concat:browser', 'uglify:browser', 'concat:webview', 'uglify:webview', 'concat:main', 'electron:osxBuild', 'electron:windowsBuild', 'electron:linuxBuild'])

};
