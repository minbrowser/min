# Min

Min is a fast, minimal browser that protects your privacy. It includes an interface designed to minimize distractions, and features such as:

* Information from [DuckDuckGo](https://duckduckgo.com) in the search bar.
* Full-text search for visited pages
* Ad and tracker blocking
* Automatic reader view
* Tasks (tab groups)
* Password manager integration
* Dark theme

Download Min from the [releases page](https://github.com/minbrowser/min/releases), or learn more on the [website](https://minbrowser.org/).


Min is made possible by these sponsors:

|[<img src="https://avatars1.githubusercontent.com/u/22417494?s=460&v=4" width="40">](https://github.com/shalva97)|[<img src="https://avatars3.githubusercontent.com/u/17785839?s=400&v=4" width="40">](https://github.com/ritterob)|   |
|---|---|---|
|[@shalva97](https://github.com/shalva97)|[@ritterob](https://github.com/ritterob)|   |

[Become a sponsor](https://github.com/sponsors/PalmerAL)

## Screenshots

<img alt="The search bar, showing information from DuckDuckGo" src="http://minbrowser.org/tour/img/searchbar_duckduckgo_answers.png" width="650"/>

<img alt="The Tasks Overlay" src="http://minbrowser.org/tour/img/tasks.png" width="650"/>

<img alt="Reader View" src="https://user-images.githubusercontent.com/10314059/53312382-67ca7d80-387a-11e9-9ccc-88ac592c9b1c.png" width="650"/>

## Installing

You can find prebuilt binaries for Min [here](https://github.com/minbrowser/min/releases). Alternatively, skip to the section below for instructions on how to build Min directly from source.

### Installation on Linux

* To install the .deb file, use `sudo dpkg -i /path/to/download`
* To install the RPM build, use `sudo rpm -i /path/to/download --ignoreos`

## Developing

If you want to develop Min:

* Install [Node](https://nodejs.org).
* Run `npm install` to install dependencies.
* Start Min in development mode by running `npm run start`.
* After you make changes, you can press `ctrl+r` (or `cmd+r` on Mac) twice to restart the browser.

### Building binaries

In order to build Min from source, follow the installation instructions above, then use one of the following commands to create binaries:
* ```npm run buildWindows```
* ```npm run buildMac```
* ```npm run buildDebian```
* ```npm run buildRaspi``` (for Raspberry Pi, Raspberry Pi OS)
* ```npm run buildLinuxArm64```
* ```npm run buildRedhat```

Depending on the platform you are building for, you may need to install additional dependencies:
* If you are using macOS and building a package for Linux, install [Homebrew](http://brew.sh), then run `brew install fakeroot dpkg` first.
* If you are using macOS or Linux and building a package for Windows, you will need to install [Mono](https://www.mono-project.com/) and [Wine](https://www.winehq.org/).

## Contributing to Min

Thanks for taking the time to contribute to Min! If you have any questions or run into any problems, please [open an issue](https://github.com/minbrowser/min/issues/new). We also have a [Discord server](https://discord.gg/bRpqjJ4) where you can ask questions or talk about what you're working on.

### Contributing Code

* Start by following the development instructions listed above.
* The wiki has an [overview of Min's architecture](https://github.com/minbrowser/min/wiki/Architecture).
* Min uses the [Standard](https://github.com/feross/standard) code style; [most editors](https://standardjs.com/#are-there-text-editor-plugins) have plugins available to auto-format your code.
* If you see something that's missing, or run into any problems, please open an issue!

### Contributing Translations

#### Adding a new language

* Find the language code that goes with your language from [this list](https://electron.atom.io/docs/api/locales/#locales).
* In the `localization/languages` directory, create a new file, and name it "[your language code].json".
* Open your new file, and copy the contents of the <a href="https://github.com/minbrowser/min/blob/master/localization/languages/en-US.json">localization/languages/en-US.json</a> file into your new file.
* Change the "identifier" field in the new file to the language code from step 1.
* Inside the file, replace each English string in the right-hand column with the equivalent translation.
* (Optional) See your translations live by following the [development instructions](#installing) above. Min will display in the same language as your operating system, so make sure your computer is set to the same language that you're translating.
* That's it! Make a pull request with your changes.

#### Updating an existing language

* Find the language file for your language in the `localization/languages` directory.
* Look through the file for any items that have a value of "null", or that have a comment saying "missing translation".
* For each of these items, look for the item with the same name in the `en-US.json` file.
* Translate the value from the English file, replace "null" with your translation, and remove the "missing translation" comment.
* Make a pull request with the updated file.
