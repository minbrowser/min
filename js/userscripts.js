/* implements userscript support */

var path = require('path')
var chokidar = require('chokidar')

var webviews = require('webviews.js')
var settings = require('util/settings/settings.js')
var bangsPlugin = require('searchbar/bangsPlugin.js')
var tabEditor = require('navbar/tabEditor.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var urlParser = require('util/urlParser.js')


function parseTampermonkeyFeatures (content) {
  var parsedFeatures = {}
  var foundFeatures = false

  var lines = content.split('\n')

  var isInFeatures = false
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '// ==UserScript==') {
      isInFeatures = true
      continue
    }
    if (lines[i].trim() === '// ==/UserScript==') {
      isInFeatures = false
      break
    }
    if (isInFeatures && lines[i].startsWith('//')) {
      foundFeatures = true
      var feature = lines[i].replace('//', '').trim()
      var featureName = feature.split(' ')[0]
      var featureValue = feature.replace(featureName + ' ', '').trim()
      featureName = featureName.replace('@', '')

      // special case: find the localized name for the current locale
      if (featureName.startsWith('name:') && featureName.split(':')[1].substring(0, 2) === navigator.language.substring(0, 2)) {
        featureName = 'name:local'
      }
      if (parsedFeatures[featureName]) {
        parsedFeatures[featureName].push(featureValue)
      } else {
        parsedFeatures[featureName] = [featureValue]
      }
    }
  }
  if (foundFeatures) {
    return parsedFeatures
  } else {
    return null
  }
}

// checks if a URL matches a wildcard pattern
function urlMatchesPattern (url, pattern) {
  var idx = -1
  var parts = pattern.split('*')
  for (var i = 0; i < parts.length; i++) {
    idx = url.indexOf(parts[i], idx)
    if (idx === -1) {
      return false
    }
    idx += parts[i].length
  }
  return idx !== -1
}

const userscripts = {
  scriptDir: path.join(window.globalArgs['user-data-path'], 'userscripts'),
  scripts: [], // {options: {}, content}
  showDirectory: function () {
    electron.shell.openPath(userscripts.scriptDir)
  },
  ensureDirectoryExists: function () {
    fs.access(userscripts.scriptDir, fs.constants.R_OK, function (err) {
      if (err) {
        fs.mkdir(userscripts.scriptDir, function (err) {
          if (err) {
            console.warn('failed to create userscripts directory', err)
          }
        })
      }
    })
  },
  loadScripts: function () {
    userscripts.scripts = []

    fs.readdir(userscripts.scriptDir, function (err, files) {
      if (err) {
        userscripts.ensureDirectoryExists()
        return
      } else if (files.length === 0) {
        return
      }

      // store the scripts in memory
      files.forEach(function (filename) {
        if (filename.endsWith('.js')) {
          fs.readFile(path.join(userscripts.scriptDir, filename), 'utf-8', function (err, file) {
            if (err || !file) {
              return
            }

            var domain = filename.slice(0, -3)
            if (domain.startsWith('www.')) {
              domain = domain.slice(4)
            }
            if (!domain) {
              return
            }

            var tampermonkeyFeatures = parseTampermonkeyFeatures(file)
            if (tampermonkeyFeatures) {
              var scriptName = tampermonkeyFeatures['name:local'] || tampermonkeyFeatures.name
              if (scriptName) {
                scriptName = scriptName[0]
              } else {
                scriptName = filename
              }
              userscripts.scripts.push({ options: tampermonkeyFeatures, content: file, name: scriptName })
            } else {
              // legacy script
              if (domain === 'global') {
                userscripts.scripts.push({
                  options: {
                    match: ['*']
                  },
                  content: file,
                  name: filename
                })
              } else {
                userscripts.scripts.push({
                  options: {
                    match: ['*://' + domain]
                  },
                  content: file,
                  name: filename
                })
              }
            }
          })
        }
      })
    })
  },
  startDirWatcher: function () {
    userscripts.stopDirWatcher() // destroy any previous instance
    userscripts.watcherInstance = chokidar.watch(userscripts.scriptDir, {
      ignoreInitial: true,
      disableGlobbing: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    })
    userscripts.watcherInstance.on('all', debounce(function () {
      userscripts.loadScripts()
    }, 100))
  },
  stopDirWatcher: function () {
    if (userscripts.watcherInstance) {
      userscripts.watcherInstance.close()
      userscripts.watcherInstance = null
    }
  },
  getMatchingScripts: function (src) {
    return userscripts.scripts.filter(function (script) {
      if (
        (!script.options.match && !script.options.include) ||
        (script.options.match && script.options.match.some(pattern => urlMatchesPattern(src, pattern))) ||
        (script.options.include && script.options.include.some(pattern => urlMatchesPattern(src, pattern)))) {
        if (!script.options.exclude || !script.options.exclude.some(pattern => urlMatchesPattern(src, pattern))) {
          return true
        }
      }
    })
  },
  runScript: function (tabId, script) {
    if (urlParser.isInternalURL(tabs.get(tabId).url)) {
      return
    }
    webviews.callAsync(tabId, 'executeJavaScript', [script.content, false, null])
  },
  onPageLoad: function (tabId) {
    if (userscripts.scripts.length === 0) {
      return
    }

    var src = tabs.get(tabId).url

    userscripts.getMatchingScripts(src).forEach(function (script) {
      // TODO run different types of scripts at the correct time
      if (!script.options['run-at'] || script.options['run-at'].some(i => ['document-start', 'document-body', 'document-end', 'document-idle'].includes(i))) {
        userscripts.runScript(tabId, script)
      }
    })
  },
  initialize: function () {
  
    settings.listen('userscriptsEnabled', function (value) {
      if (value === true) {
        userscripts.loadScripts()
        userscripts.startDirWatcher()
      } else {
        userscripts.scripts = []
        userscripts.stopDirWatcher()
      }
    })
    webviews.bindEvent('dom-ready', userscripts.onPageLoad)

    webviews.bindIPC('showUserscriptDirectory', function () {
      userscripts.showDirectory()
    })

    bangsPlugin.registerCustomBang({
      phrase: '!run',
      snippet: l('runUserscript'),
      isAction: false,
      showSuggestions: function (text, input, event) {
        searchbarPlugins.reset('bangs')

        var isFirst = true
        userscripts.scripts.forEach(function (script) {
          if (script.name.toLowerCase().startsWith(text.toLowerCase())) {
            searchbarPlugins.addResult('bangs', {
              title: script.name,
              fakeFocus: isFirst && text,
              click: function () {
                tabEditor.hide()
                userscripts.runScript(tabs.getSelected(), script)
              }
            })
            isFirst = false
          }
        })
      },
      fn: function (text) {
        if (!text) {
          return
        }
        var matchingScript = userscripts.scripts.find(script => script.name.toLowerCase().startsWith(text.toLowerCase()))
        if (matchingScript) {
          userscripts.runScript(tabs.getSelected(), matchingScript)
        }
      }
    })
  }
}

module.exports = userscripts
