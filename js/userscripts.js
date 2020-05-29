/* implements userscript support */

var webviews = require('webviews.js')
var settings = require('util/settings/settings.js')

var userScriptsEnabled = false
var scriptList = [] // {options: {}, content}

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

if (settings.get('userscriptsEnabled') === true) {
  userScriptsEnabled = true

    /* get a list of all the files */

  var path = require('path')
  var scriptDir = path.join(window.globalArgs['user-data-path'], 'userscripts')

  fs.readdir(scriptDir, function (err, files) {
    if (err || files.length === 0) {
      return
    }

      // store the scripts in memory
    files.forEach(function (filename) {
      if (filename.endsWith('.js')) {
        fs.readFile(path.join(scriptDir, filename), 'utf-8', function (err, file) {
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
            scriptList.push({options: tampermonkeyFeatures, content: file})
          } else {
            // legacy script
            if (domain === 'global') {
              scriptList.push({
                options: {
                  match: ['*']
                },
                content: file
              })
            } else {
              scriptList.push({
                options: {
                  match: ['*://' + domain]
                },
                content: file
              })
            }
          }
        })
      }
    })
  })
}

/* listen for load events and execute the scripts
this listener has to be attached immediately so that we can capture events for
webviews that are created at startup
*/

webviews.bindEvent('dom-ready', function (tabId) {
  if (!userScriptsEnabled) {
    return
  }

  webviews.callAsync(tabId, 'getURL', (err, src) => {
    if (err) {
      return
    }
    scriptList.forEach(function (script) {
      if ((script.options.match && script.options.match.some(pattern => urlMatchesPattern(src, pattern))) || (script.options.include && script.options.include.some(pattern => urlMatchesPattern(src, pattern)))) {
        if (!script.options.exclude || !script.options.exclude.some(pattern => urlMatchesPattern(src, pattern))) {
          webviews.callAsync(tabId, 'executeJavaScript', [script.content, false, null])
        }
      }
    })
  })
})
