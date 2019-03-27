# Min

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Min is a fast, minimal browser that protects your privacy. It includes an interface designed to minimize distractions, and features such as:

* Information from [DuckDuckGo](https://duckduckgo.com) in the search bar.
* Full-text search for visited pages
* Automatic ad and tracker blocking
* Reader view
* Tasks (tab groups)
* Dark theme

More information, and prebuilt binaries are available [here](https://minbrowser.github.io/min/).

> Note: Min uses an older version of Chromium, which may be missing security fixes from later versions. [More Information](https://github.com/minbrowser/min/issues/440#issuecomment-338080554)

## Screenshots

![The search bar, showing information from DuckDuckGo](http://minbrowser.github.io/min/tour/img/searchbar_duckduckgo_answers.png)

![The Tasks Overlay](http://minbrowser.github.io/min/tour/img/tasks.png)

![Reader View](https://user-images.githubusercontent.com/10314059/53312382-67ca7d80-387a-11e9-9ccc-88ac592c9b1c.png)

## Installing

You can find prebuilt binaries for Min [here](https://github.com/minbrowser/min/releases). Alternatively, you can build Min directly from the source code:

* If you are using OS X, install [Homebrew](http://brew.sh), then run `brew install fakeroot dpkg`.
* Then, run `grunt macBuild`, `grunt linuxBuild`, or `grunt windowsBuild` depending on which platform you want binaries for.

## Developing

If you want to develop Min:

* Install [Node](https://nodejs.org) and [Grunt](http://gruntjs.com).
* Run `npm install` to install dependencies.
* Build the translation files and a copy of the JS by running `npm run build`.
  * You can also watch for changes and automatically rebuild by running `npm run watch`.
* Download a copy of Electron from [here](https://github.com/electron/electron/releases).
* Start Min by running `node_modules/.bin/electron .`.<sup>1</sup>

<sup>1</sup>: _Make sure no `Min` instance is already running before starting the development version of `Min`._<br>

## Contributing to Min

Please feel free to open an issue with any problems you encounter or suggestions you have. Code contributions are also highly appreciated; if you have any questions about how to add something to Min, please open an issue about it.

### Contributing Translations

Thanks for taking the time to translate Min! To add translations for your local language:

* Find the language code that goes with your language from [this list](https://electron.atom.io/docs/api/locales/#locales).
* In the `localization/languages` directory, create a new file, and name it "[your language code].json".
* Open your new file, and copy the contents of the <a href="https://github.com/minbrowser/min/blob/master/localization/languages/en-US.json">localization/languages/en-US.json</a> file into your new file.
* Change the "identifier" field in the new file to the language code from step 1.
* Inside the file, replace each English string in the right-hand column with the equivalent translation.
* (Optional) See your translations live by following the [development instructions](#installing) above. Min will display in the same language as your operating system, so make sure your computer is set to the same language that you're translating.
* That's it! Make a pull request with your changes.
