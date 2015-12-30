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
						 "js/tabState.js",
						"js/util/urlParser.js",
						"js/webviews.js",
						 "js/webviewMenu.js",
						"js/bookmarksHistory/bookmarksHistory.js",
						 "js/api-wrapper.js",
							"js/searchbar/history.js",
							"js/searchbar/bookmarks.js",
							"js/searchbar/duckduckgo.js",
							"js/searchbar/tabsearch.js",
						 "js/searchbar/searchbar.js",
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
						"js/webview/fileViewer.js"
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
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', ['concat:browser', 'uglify:browser', 'concat:webview', 'uglify:webview']);
	grunt.registerTask('browser', ['concat:browser', 'uglify:browser']);
	grunt.registerTask('webview', ['concat:webview', 'uglify:webview']);

};
