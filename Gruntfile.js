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
						"js/webviews.js",
						"js/bookmarkshistory.js",
						"ext/color-thief/src/color-thief.js",
						"js/urlParser.js",
						 "js/tabcolor.js",
						 "js/webviewMenu.js",
						 "js/api-wrapper.js",
							"js/awesomebar/history.js",
							"js/awesomebar/bookmarks.js",
							"js/awesomebar/duckduckgo.js",
							"js/awesomebar/topics.js",
							"js/awesomebar/tabsearch.js",
						 "js/awesomebar/awesomebar.js",
							"js/readerView.js",
						 "js/tabState.js",
						 "js/tabActivity.js",
						 "js/navbarTabs.js",
						 "js/keybindings.js",
						 "js/fileDownloadManager.js",
						 "js/findinpage.js",
							"js/sessionRestore.js",
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
						"js/webview/swipeNavigation.js",
						"js/webview/zoom.js",
						 ],
				dest: 'dist/webview.js'
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
			}
		},
		removelogging: {
			browser: {
				src: "dist/build.min.js"
			},
			webview: {
				src: "dist/webview.min.js",
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks("grunt-remove-logging");

	grunt.registerTask('default', ['concat:browser', 'uglify:browser', 'concat:webview', 'uglify:webview', 'removelogging:browser', 'removelogging:webview']);
	grunt.registerTask('browser', ['concat:browser', 'uglify:browser', 'removelogging:browser']);
	grunt.registerTask('webview', ['concat:webview', 'uglify:webview', 'removelogging:webview']);

};
