# Min

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Min is a smarter, faster web browser. It includes features such as:

* Information from [DuckDuckGo](https://duckduckgo.com) in the search bar.
* Built-in ad and tracker blocking
* Fuzzy search
* Full-text search for visited pages
* Reading list
* Tabs improvements (tabs open to the right, and fade out when inactive).
* Dark theme

More information, and prebuilt binaries are available [here](https://minbrowser.github.io/min/).

> Note: Min uses an older version of Chromium, which may be missing security fixes from later versions. [More Information](https://github.com/minbrowser/min/issues/440#issuecomment-338080554)

## Screenshots

![The search bar, showing information from DuckDuckGo](http://minbrowser.github.io/min/tour/img/searchbar_duckduckgo_answers.png)

![The Tasks Overlay](http://minbrowser.github.io/min/tour/img/tasks.png)

![Reader View](https://minbrowser.github.io/min/tour/img/reading_list.png)

## Installing

If you just want to run Min, you can download binaries [here](https://github.com/minbrowser/min/releases).

If you want to develop Min:

* Install [Node](https://nodejs.org) and [Grunt](http://gruntjs.com).
* Run `npm install` to install dependencies.
* Run ```npm run buildTranslations``` to build the translation files.
* Build a copy of the JS by running ```grunt```.
  * You can also have Grunt watch for changes and automatically rebuild by running ```grunt watch:scripts```.
* Download a copy of Electron from [here](https://github.com/electron/electron/releases).
* Start Min by running `/Path/To/Electron /Path/To/Min`.

## Building Binaries

If you are using OS X, install [Homebrew](http://brew.sh), then run `brew install fakeroot dpkg`.
Then:
* Run ```npm run buildTranslations``` and ```npm run updateFilters``` to build the translation files and update the version of EasyList included with Min.
* Run ```grunt macBuild```, ```grunt linuxBuild```, or ```grunt windowsBuild``` depending on which platform you want binaries for (Windows is only partially supported).

## Contributing Translations

Thanks for taking the time to translate Min! To add translations for your local language:

* Find the language code that goes with your language from [this list](https://electron.atom.io/docs/api/locales/#locales).
* In the ```localization/languages``` directory, create a new file, and name it "[your language code].json".
* Open your new file, and copy the contents of the <a href="https://github.com/minbrowser/min/blob/master/localization/languages/en-US.json">localization/languages/en-US.json</a> file into your new file.
* Change the "identifier" field in the new file to the language code from step 1.
* Inside the file, replace each English string in the right-hand column with the equivalent translation.
* (Optional) See your translations live by following the [development instructions](#installing) above. Min will display in the same language as your operating system, so make sure your computer is set to the same language that you're translating.
* That's it! Make a pull request with your changes.
