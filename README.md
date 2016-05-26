# Min

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Min is a smarter, faster web browser. It includes features such as:

* Information from [DuckDuckGo](https://duckduckgo.com) in the searchbar.
* Built-in ad and tracker blocking
* Fuzzy search
* Full-text search for bookmarks
* Reading list
* Tabs improvements (tabs open to the right, and fade out when inactive).

More information, and prebuilt binaries, are available [here](https://minbrowser.github.io/min/).

## Screenshots

![The searchbar, showing information from DuckDuckGo](http://minbrowser.github.io/min/tour/img/searchbar_duckduckgo_answers.png)

![The Tasks Overlay](http://minbrowser.github.io/min/tour/img/tasks.png)

![Reader View](https://minbrowser.github.io/min/tour/img/reading_list.png)

## Installing

If you just want to run Min, you can download binaries [here](https://github.com/minbrowser/min/releases).

If you want to develop Min:

* Install [Node](https://nodejs.org) and [Grunt](http://gruntjs.com).
* Run `npm install`, then run `grunt`.
* Download a copy of Electron from [here](https://github.com/electron/electron/releases).
* Run `/Path/To/Electron /Path/To/Min`.

## Building Binaries

If you are using OS X, install [Homebrew](http://brew.sh), then run `brew install fakeroot dpkg`.
Then run `grunt build`.
