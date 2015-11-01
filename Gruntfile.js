module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				separator: ';'
			},
			dist: {
				src: [
						"ext/color-thief/src/color-thief.js",
						"js/urlParser.js",
						 "js/tabcolor.js",
						 "js/webview-menu.js",
						 "js/api-wrapper.js",
						 "js/awesomebar.js",
							"js/webviews.js",
							"js/readerView.js",
						 "js/tabState.js",
						 "js/bookmarkshistory.js",
						 "js/tabActivity.js",
						 "js/navbar-tabs.js",
						 "js/keybindings.js",
						 "js/fileDownloadManager.js",
						 "js/findinpage.js"
						 ],
				dest: 'dist/build.js'
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= grunt.template.today("mm-dd-yyyy") %> */\n'
			},
			build: {
				src: 'dist/build.js',
				dest: 'dist/build.min.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// Default task(s).
	grunt.registerTask('default', ['concat', 'uglify']);

};
