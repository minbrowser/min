document.title = l('settingsPreferencesHeading') + ' | Min'

var container = document.getElementById('privacy-settings-container')
var trackerCheckbox = document.getElementById('checkbox-block-trackers')
var banner = document.getElementById('restart-required-banner')
var darkModeCheckbox = document.getElementById('checkbox-dark-mode')
var historyButtonCheckbox = document.getElementById('checkbox-history-button')
var swipeNavigationCheckbox = document.getElementById('checkbox-swipe-navigation')
var userscriptsCheckbox = document.getElementById('checkbox-userscripts')

function showRestartRequiredBanner () {
  banner.hidden = false
}

/* tracking checkbox */

settings.get('filtering', function (value) {
  if (value) {
    trackerCheckbox.checked = value.trackers
  }
})

trackerCheckbox.addEventListener('change', function (e) {
  settings.get('filtering', function (value) {
    if (!value) {
      value = {}
    }
    value.trackers = e.target.checked
    settings.set('filtering', value)
    banner.hidden = false
  })
})

/* content type settings */

var contentTypes = {
  // humanReadableName: contentType
  'scripts': 'script',
  'images': 'image'
}

// used for showing localized strings
var contentTypeSettingNames = {
  'scripts': 'settingsBlockScriptsToggle',
  'images': 'settingsBlockImagesToggle'
}

for (var contentType in contentTypes) {
  (function (contentType) {
    settings.get('filtering', function (value) {
      // create the settings section for blocking each content type

      var section = document.createElement('div')
      section.classList.add('setting-section')

      var id = 'checkbox-block-' + contentTypes[contentType]

      var checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.id = id

      if (value && value.contentTypes) {
        checkbox.checked = value.contentTypes.indexOf(contentTypes[contentType]) != -1
      }

      var label = document.createElement('label')
      label.setAttribute('for', id)
      label.textContent = l(contentTypeSettingNames[contentType])

      section.appendChild(checkbox)
      section.appendChild(label)

      container.appendChild(section)

      checkbox.addEventListener('change', function (e) {
        settings.get('filtering', function (value) {
          if (!value) {
            value = {}
          }
          if (!value.contentTypes) {
            value.contentTypes = []
          }

          if (e.target.checked) { // add the item to the array
            value.contentTypes.push(contentTypes[contentType])
          } else { // remove the item from the array
            var idx = value.contentTypes.indexOf(contentTypes[contentType])
            value.contentTypes.splice(idx, 1)
          }

          settings.set('filtering', value)
          banner.hidden = false
        })
      })
    })
  })(contentType)
}

/* dark mode setting */

settings.get('darkMode', function (value) {
  darkModeCheckbox.checked = value
})

darkModeCheckbox.addEventListener('change', function (e) {
  settings.set('darkMode', this.checked)
  showRestartRequiredBanner()
})

/* history button setting */

settings.get('historyButton', function (value) {
  if (value === true || value === undefined) {
    historyButtonCheckbox.checked = true
  } else {
    historyButtonCheckbox.checked = false
  }
})

historyButtonCheckbox.addEventListener('change', function (e) {
  settings.set('historyButton', this.checked)
  showRestartRequiredBanner()
})

/* swipe navigation settings */

settings.get('swipeNavigationEnabled', function (value) {
  if (value === true || value === undefined) {
    swipeNavigationCheckbox.checked = true
  } else {
    swipeNavigationCheckbox.checked = false
  }
})

swipeNavigationCheckbox.addEventListener('change', function (e) {
  settings.set('swipeNavigationEnabled', this.checked)
  showRestartRequiredBanner()
})

/* userscripts setting */

settings.get('userscriptsEnabled', function (value) {
  if (value === true) {
    userscriptsCheckbox.checked = true
  }
})

userscriptsCheckbox.addEventListener('change', function (e) {
  settings.set('userscriptsEnabled', this.checked)
  showRestartRequiredBanner()
})

/* default search engine setting */

var searchEngineDropdown = document.getElementById('default-search-engine')
var searchEngineInput = document.getElementById('custom-search-engine')

searchEngineInput.setAttribute('placeholder', l('customSearchEngineDescription'))

settings.onLoad(function () {
  if (currentSearchEngine.custom) {
    searchEngineInput.hidden = false
    searchEngineInput.value = currentSearchEngine.searchURL
  }

  for (var searchEngine in searchEngines) {
    var item = document.createElement('option')
    item.textContent = searchEngines[searchEngine].name

    if (searchEngines[searchEngine].name == currentSearchEngine.name) {
      item.setAttribute('selected', 'true')
    }

    searchEngineDropdown.appendChild(item)
  }

  // add custom option
  item = document.createElement('option')
  item.textContent = 'custom'
  if (currentSearchEngine.custom) {
    item.setAttribute('selected', 'true')
  }
  searchEngineDropdown.appendChild(item)
})

searchEngineDropdown.addEventListener('change', function (e) {
  if (this.value === 'custom') {
    searchEngineInput.hidden = false
  } else {
    searchEngineInput.hidden = true
    settings.set('searchEngine', {name: this.value})
    showRestartRequiredBanner()
  }
})

searchEngineInput.addEventListener('change', function (e) {
  settings.set('searchEngine', {url: this.value})
  showRestartRequiredBanner()
})

/* key map settings */

settings.get('keyMap', function (keyMapSettings) {
  var keyMap = userKeyMap(keyMapSettings)

  var keyMapList = document.getElementById('key-map-list')

  Object.keys(keyMap).forEach(function (action) {
    var li = createKeyMapListItem(action, keyMap)
    keyMapList.appendChild(li)
  })
})

function formatCamelCase (text) {
  var result = text.replace(/([A-Z])/g, ' $1')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

function createKeyMapListItem (action, keyMap) {
  var li = document.createElement('li')
  var label = document.createElement('label')
  var input = document.createElement('input')
  label.innerText = formatCamelCase(action)
  label.htmlFor = action

  input.type = 'text'
  input.id = input.name = action
  input.value = formatKeyValue(keyMap[action])
  input.addEventListener('change', onKeyMapChange)

  li.appendChild(label)
  li.appendChild(input)

  return li
}

function formatKeyValue (value) {
  // multiple shortcuts should be separated by commas
  if (value instanceof Array) {
    value = value.join(', ')
  }
  // use either command or ctrl depending on the platform
  if (navigator.platform === 'MacIntel') {
    value = value.replace(/\bmod\b/g, 'command')
  } else {
    value = value.replace(/\bmod\b/g, 'ctrl')
    value = value.replace(/\boption\b/g, 'alt')
  }
  return value
}

function parseKeyInput (input) {
  // input may be a single mapping or multiple mappings comma separated.
  var parsed = input.toLowerCase().split(',')
  parsed = parsed.map(function (e) { return e.trim() })
  // Remove empty
  parsed = parsed.filter(Boolean)
  // convert key names back to generic equivalents
  parsed = parsed.map(function (e) {
    if (navigator.platform === 'MacIntel') {
      e = e.replace(/\b(command)|(cmd)\b/g, 'mod')
    } else {
      e = e.replace(/\b(control)|(ctrl)\b/g, 'mod')
      e = e.replace(/\balt\b/g, 'option')
    }
    return e
  })
  return parsed.length > 1 ? parsed : parsed[0]
}

function onKeyMapChange (e) {
  var action = this.name
  var newValue = this.value

  settings.get('keyMap', function (keyMapSettings) {
    if (!keyMapSettings) {
      keyMapSettings = {}
    }

    keyMapSettings[action] = parseKeyInput(newValue)
    settings.set('keyMap', keyMapSettings, function () {
      showRestartRequiredBanner()
    })
  })
}
