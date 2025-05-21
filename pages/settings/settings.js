
document.title = l('settingsPreferencesHeading') + ' | FireMin'
var contentTypeBlockingContainer = document.getElementById('content-type-blocking')
var banner = document.getElementById('restart-required-banner')
var siteThemeCheckbox = document.getElementById('checkbox-site-theme')
var showDividerCheckbox = document.getElementById('checkbox-show-divider')
var userscriptsCheckbox = document.getElementById('checkbox-userscripts')
var userscriptsShowDirectorySection = document.getElementById('userscripts-show-directory')
var separateTitlebarCheckbox = document.getElementById('checkbox-separate-titlebar')
var openTabsInForegroundCheckbox = document.getElementById('checkbox-open-tabs-in-foreground')
var autoPlayCheckbox = document.getElementById('checkbox-enable-autoplay')
var userAgentCheckbox = document.getElementById('checkbox-user-agent')
var userAgentInput = document.getElementById('input-user-agent')



/* content blocking settings */

var trackingLevelContainer = document.getElementById('tracking-level-container')
var trackingLevelOptions = Array.from(trackingLevelContainer.querySelectorAll('input[name=blockingLevel]'))
var blockingExceptionsContainer = document.getElementById('content-blocking-information')
var blockingExceptionsInput = document.getElementById('content-blocking-exceptions')
var blockedRequestCount = document.querySelector('#content-blocking-blocked-requests strong')

settings.listen('filteringBlockedCount', function (value) {
  var count = value || 0
  var valueStr
  if (count > 50000) {
    valueStr = new Intl.NumberFormat(navigator.locale, { notation: 'compact', maximumSignificantDigits: 4 }).format(count)
  } else {
    valueStr = new Intl.NumberFormat().format(count)
  }
  blockedRequestCount.textContent = valueStr
})

function updateBlockingLevelUI (level) {
  var radio = trackingLevelOptions[level]
  radio.checked = true

  if (level === 0) {
    blockingExceptionsContainer.hidden = true
  } else {
    blockingExceptionsContainer.hidden = false
    radio.parentNode.appendChild(blockingExceptionsContainer)
  }

  if (document.querySelector('#tracking-level-container .setting-option.selected')) {
    document.querySelector('#tracking-level-container .setting-option.selected').classList.remove('selected')
  }
  radio.parentNode.classList.add('selected')
}

function changeBlockingLevelSetting (level) {
  settings.get('filtering', function (value) {
    if (!value) {
      value = {}
    }
    value.blockingLevel = level
    settings.set('filtering', value)
    updateBlockingLevelUI(level)
  })
}

function setExceptionInputSize () {
  blockingExceptionsInput.style.height = (blockingExceptionsInput.scrollHeight + 2) + 'px'
}

settings.get('filtering', function (value) {
  // migrate from old settings (<v1.9.0)
  if (value && typeof value.trackers === 'boolean') {
    if (value.trackers === true) {
      value.blockingLevel = 2
    } else if (value.trackers === false) {
      value.blockingLevel = 0
    }
    delete value.trackers
    settings.set('filtering', value)
  }

  if (value && value.blockingLevel !== undefined) {
    updateBlockingLevelUI(value.blockingLevel)
  } else {
    updateBlockingLevelUI(1)
  }

  if (value && value.exceptionDomains && value.exceptionDomains.length > 0) {
    blockingExceptionsInput.value = value.exceptionDomains.join(', ') + ', '
    setExceptionInputSize()
  }
})

trackingLevelOptions.forEach(function (item, idx) {
  item.addEventListener('change', function () {
    changeBlockingLevelSetting(idx)
  })
})

blockingExceptionsInput.addEventListener('input', function () {
  setExceptionInputSize()

  // remove protocols because of https://github.com/minbrowser/min/issues/1428
  var newValue = this.value.split(',').map(i => i.trim().replace('http://', '').replace('https://', '')).filter(i => !!i)

  settings.get('filtering', function (value) {
    if (!value) {
      value = {}
    }
    value.exceptionDomains = newValue
    settings.set('filtering', value)
  })
})

/* content type settings */

var contentTypes = {
  // humanReadableName: contentType
  scripts: 'script',
  images: 'image'
}

// used for showing localized strings
var contentTypeSettingNames = {
  scripts: 'settingsBlockScriptsToggle',
  images: 'settingsBlockImagesToggle'
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

      contentTypeBlockingContainer.appendChild(section)

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
        })
      })
    })
  })(contentType)
}

/* Dark mode setting
 * Values:
 * -1: Never (always light mode)
 *  0: Auto (based on time of day)
 *  1: Always (always dark mode) 
 *  2: System (follow system preference)
 */
var darkModeNever = document.getElementById('dark-mode-never');
var darkModeNight = document.getElementById('dark-mode-night');
var darkModeAlways = document.getElementById('dark-mode-always');
var darkModeSystem = document.getElementById('dark-mode-system');

// Initialize radio buttons based on stored setting
settings.get('darkMode', function (value) {
  // Handle legacy boolean values
  if (value === true) {
    value = 1; // Convert true to "always dark mode"
  } else if (value === false) {
    value = 2; // Convert false to "system preference"
  }
  
  // Set radio button states based on numeric value
  darkModeNever.checked = (value === -1);
  darkModeNight.checked = (value === 0);
  darkModeAlways.checked = (value === 1);
  darkModeSystem.checked = (value === 2 || value === undefined);

  // Update Bootstrap theme
  updateBootstrapTheme(value);
});

// Add function to update Bootstrap theme
function updateBootstrapTheme(mode) {
  const html = document.documentElement;
  
  if (mode === 1) { // Always dark
    html.setAttribute('data-bs-theme', 'dark');
  } else if (mode === -1) { // Never dark
    html.setAttribute('data-bs-theme', 'light');
  } else if (mode === 0) { // Auto (night mode)
    const hours = new Date().getHours();
    html.setAttribute('data-bs-theme', (hours >= 20 || hours <= 6) ? 'dark' : 'light');
  } else { // System (mode === 2 or undefined)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.setAttribute('data-bs-theme', 'dark');
    } else {
      html.setAttribute('data-bs-theme', 'light');
    }
  }
}

// Update event listeners to call updateBootstrapTheme
darkModeNever.addEventListener('change', function (e) {
  if (this.checked) {
    settings.set('darkMode', -1);
    updateBootstrapTheme(-1);
  }
});

darkModeNight.addEventListener('change', function (e) {
  if (this.checked) {
    settings.set('darkMode', 0);
    updateBootstrapTheme(0);
  }
});

darkModeAlways.addEventListener('change', function (e) {
  if (this.checked) {
    settings.set('darkMode', 1);
    updateBootstrapTheme(1);
  }
});

darkModeSystem.addEventListener('change', function (e) {
  if (this.checked) {
    settings.set('darkMode', 2);
    updateBootstrapTheme(2);
  }
});

// Add system theme change listener
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (darkModeSystem.checked) {
      updateBootstrapTheme(2);
    }
  });
}

// For auto mode (night mode), update theme every minute
if (darkModeNight.checked) {
  setInterval(() => updateBootstrapTheme(0), 60000);
}
/* site theme setting */

settings.get('siteTheme', function (value) {
  if (value === true || value === undefined) {
    siteThemeCheckbox.checked = true
  } else {
    siteThemeCheckbox.checked = false
  }
})

siteThemeCheckbox.addEventListener('change', function (e) {
  settings.set('siteTheme', this.checked)
})

/* startup settings */

var startupSettingInput = document.getElementById('startup-options')

settings.get('startupTabOption', function(value = 2) {
  startupSettingInput.value = value
})

startupSettingInput.addEventListener('change', function() {
  settings.set('startupTabOption', parseInt(this.value))
})

/* new window settings */

var newWindowSettingInput = document.getElementById('new-window-options')

settings.get('newWindowOption', function(value = 1) {
  newWindowSettingInput.value = value
})

newWindowSettingInput.addEventListener('change', function() {
  settings.set('newWindowOption', parseInt(this.value))
})

/* userscripts setting */

settings.get('userscriptsEnabled', function (value) {
  if (value === true) {
    userscriptsCheckbox.checked = true
    userscriptsShowDirectorySection.hidden = false
  }
})

userscriptsCheckbox.addEventListener('change', function (e) {
  settings.set('userscriptsEnabled', this.checked)
  userscriptsShowDirectorySection.hidden = !this.checked
})

userscriptsShowDirectorySection.getElementsByTagName('a')[0].addEventListener('click', function() {
  postMessage({ message: 'showUserscriptDirectory' })
})

/* show divider between tabs setting */

settings.get('showDividerBetweenTabs', function (value) {
  if (value === true) {
    showDividerCheckbox.checked = true
  }
})

showDividerCheckbox.addEventListener('change', function (e) {
  settings.set('showDividerBetweenTabs', this.checked)
})

/* language setting*/

var languagePicker = document.getElementById('setting-language-picker')

for (var language in languages) { //from localization.build.js
  var item = document.createElement('option')
  item.textContent = languages[language].name
  item.value = languages[language].identifier
  languagePicker.appendChild(item)
}

languagePicker.value = getCurrentLanguage()

languagePicker.addEventListener('change', function () {
  settings.set('userSelectedLanguage', this.value)
  showRestartRequiredBanner()
})

/* separate titlebar setting */

settings.get('useSeparateTitlebar', function (value) {
  if (value === true) {
    separateTitlebarCheckbox.checked = true
  }
})

separateTitlebarCheckbox.addEventListener('change', function (e) {
  settings.set('useSeparateTitlebar', this.checked)
  showRestartRequiredBanner()
})

/* tabs in foreground setting */

settings.get('openTabsInForeground', function (value) {
  if (value === true) {
    openTabsInForegroundCheckbox.checked = true
  }
})

openTabsInForegroundCheckbox.addEventListener('change', function (e) {
  settings.set('openTabsInForeground', this.checked)
})

/* media autoplay setting */

settings.get('enableAutoplay', function (value) {
  autoPlayCheckbox.checked = value
})

autoPlayCheckbox.addEventListener('change', function (e) {
  settings.set('enableAutoplay', this.checked)
})

/* user agent settting */

settings.get('customUserAgent', function (value) {
  if (value) {
    userAgentCheckbox.checked = true
    userAgentInput.style.visibility = 'visible'
    userAgentInput.value = value
  }
})

userAgentCheckbox.addEventListener('change', function (e) {
  if (this.checked) {
    userAgentInput.style.visibility = 'visible'
  } else {
    settings.set('customUserAgent', null)
    userAgentInput.style.visibility = 'hidden'
    showRestartRequiredBanner()
  }
})

userAgentInput.addEventListener('input', function (e) {
  if (this.value) {
    settings.set('customUserAgent', this.value)
  } else {
    settings.set('customUserAgent', null)
  }
  showRestartRequiredBanner()
})

/* update notifications setting */

var updateNotificationsCheckbox = document.getElementById('checkbox-update-notifications')

settings.get('updateNotificationsEnabled', function (value) {
  if (value === false) {
    updateNotificationsCheckbox.checked = false
  } else {
    updateNotificationsCheckbox.checked = true
  }
})

updateNotificationsCheckbox.addEventListener('change', function (e) {
  settings.set('updateNotificationsEnabled', this.checked)
})

/* usage statistics setting */

var usageStatisticsCheckbox = document.getElementById('checkbox-usage-statistics')

settings.get('collectUsageStats', function (value) {
  if (value === false) {
    usageStatisticsCheckbox.checked = false
  } else {
    usageStatisticsCheckbox.checked = true
  }
})

usageStatisticsCheckbox.addEventListener('change', function (e) {
  settings.set('collectUsageStats', this.checked)
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
    settings.set('searchEngine', { name: this.value })
  }
})

searchEngineInput.addEventListener('input', function (e) {
  settings.set('searchEngine', { url: this.value })
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
  var result = text.replace(/([a-z])([A-Z])/g, '$1 $2')
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
  input.addEventListener('input', onKeyMapChange)

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
  if (navigator.platform === 'Win32') {
    value = value.replace(/\bsuper\b/g, 'win')
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
      e = e.replace(/\bwin\b/g, 'super')
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
    settings.set('keyMap', keyMapSettings)
    showRestartRequiredBanner()
  })
}

/* Password auto-fill settings  */

var passwordManagersDropdown = document.getElementById('selected-password-manager')
for (var manager in passwordManagers) {
  var item = document.createElement('option')
  item.textContent = passwordManagers[manager].name
  passwordManagersDropdown.appendChild(item)
}

// Import performance settings
const performanceSettings = require('util/performance.js')

// Initialize performance settings
performanceSettings.initialize()

// Setup performance settings handlers
const hardwareAccel = document.getElementById('enable-hardware-acceleration')
const limitTabCache = document.getElementById('limit-tab-caching')
const maxCachedTabs = document.getElementById('max-cached-tabs')
const preloadNextPage = document.getElementById('preload-next-page')

hardwareAccel.checked = settings.get('enableHardwareAcceleration')
limitTabCache.checked = settings.get('limitTabCaching') 
maxCachedTabs.value = settings.get('maxCachedTabs')
preloadNextPage.checked = settings.get('preloadNextPage')

hardwareAccel.addEventListener('change', function (e) {
  settings.set('enableHardwareAcceleration', e.target.checked)
  performanceSettings.applySettings()
})

limitTabCache.addEventListener('change', function (e) {
  settings.set('limitTabCaching', e.target.checked)
  performanceSettings.applySettings()
})

maxCachedTabs.addEventListener('change', function (e) {
  settings.set('maxCachedTabs', parseInt(e.target.value))
  performanceSettings.applySettings()
})

preloadNextPage.addEventListener('change', function (e) {
  settings.set('preloadNextPage', e.target.checked)
  performanceSettings.applySettings()
})

settings.listen('passwordManager', function (value) {
  passwordManagersDropdown.value = currentPasswordManager.name
})

passwordManagersDropdown.addEventListener('change', function (e) {
  if (this.value === 'none') {
    settings.set('passwordManager', { name: 'none' })
  } else {
    settings.set('passwordManager', { name: this.value })
  }
})

var keychainViewLink = document.getElementById('keychain-view-link')

keychainViewLink.addEventListener('click', function () {
  postMessage({ message: 'showCredentialList' })
})

settings.listen('passwordManager', function (value) {
  keychainViewLink.hidden = !(currentPasswordManager.name === 'Built-in password manager')
})

/* proxy settings */

const proxyTypeInput = document.getElementById('selected-proxy-type')
const proxyInputs = Array.from(document.querySelectorAll('#proxy-settings-container input'))

const toggleProxyOptions = proxyType => {
  document.getElementById('manual-proxy-section').hidden = proxyType != 1
  document.getElementById('pac-option').hidden = proxyType != 2
}

const setProxy = (key, value) => {
  settings.get('proxy', (proxy = {}) => {
    proxy[key] = value
    settings.set('proxy', proxy)
  })
}

settings.get('proxy', (proxy = {}) => {
  toggleProxyOptions(proxy.type)

  proxyTypeInput.options.selectedIndex = proxy.type || 0
  proxyInputs.forEach(item => item.value = proxy[item.name] || '')
})

proxyTypeInput.addEventListener('change', e => {
  const proxyType = e.target.options.selectedIndex
  setProxy('type', proxyType)
  toggleProxyOptions(proxyType)
})

proxyInputs.forEach(item => item.addEventListener('change', e => setProxy(e.target.name, e.target.value)))

settings.get('customBangs', (value) => {
  const bangslist = document.getElementById('custom-bangs')

  if (value) {
    value.forEach(function (bang) {
      bangslist.appendChild(createBang(bang.phrase, bang.snippet, bang.redirect))
    })
  }
})

document.getElementById('add-custom-bang').addEventListener('click', function () {
  const bangslist = document.getElementById('custom-bangs')
  bangslist.appendChild(createBang())
})

// ... existing code ...

function createBang(bang, snippet, redirect) {
  const li = document.createElement('li')
  li.className = 'custom-bang-item mb-3 p-3 border rounded'

  // Create inputs with Bootstrap classes
  const bangInput = document.createElement('input')
  bangInput.className = 'form-control mb-2'
  bangInput.type = 'text'
  bangInput.placeholder = l('settingsCustomBangsPhrase')
  bangInput.value = bang ?? ''

  const snippetInput = document.createElement('input')
  snippetInput.className = 'form-control mb-2'
  snippetInput.type = 'text'
  snippetInput.placeholder = l('settingsCustomBangsSnippet')
  snippetInput.value = snippet ?? ''

  const redirectInput = document.createElement('input')
  redirectInput.className = 'form-control mb-2'
  redirectInput.type = 'text'
  redirectInput.placeholder = l('settingsCustomBangsRedirect')
  redirectInput.value = redirect ?? ''

  const xButton = document.createElement('button')
  xButton.className = 'btn btn-danger btn-sm'
  xButton.innerHTML = '<i class="i carbon:close"></i> Remove'

  const current = { phrase: bang ?? '', snippet: snippet ?? '', redirect: redirect ?? '' }

  function update(key, input) {
    settings.get('customBangs', function(d) {
      let bangs = d || []
      // Remove the current bang from the list
      bangs = bangs.filter(b => b.phrase !== current.phrase)
      // Add the updated bang
      bangs.push({
        phrase: bangInput.value,
        snippet: snippetInput.value,
        redirect: redirectInput.value
      })
      settings.set('customBangs', bangs)
      current[key] = input.value
      showRestartRequiredBanner()
    })
  }

  // Event listeners
  bangInput.addEventListener('change', function() {
    if (this.value.startsWith('!')) {
      this.value = this.value.slice(1)
    }
    update('phrase', this)
  })

  snippetInput.addEventListener('change', function() {
    update('snippet', this)
  })

  redirectInput.addEventListener('change', function() {
    update('redirect', this)
  })

  xButton.addEventListener('click', function() {
    settings.get('customBangs', function(d) {
      const bangs = (d || []).filter(b => b.phrase !== bangInput.value)
      settings.set('customBangs', bangs)
      li.remove()
      showRestartRequiredBanner()
    })
  })

  // Create labels
  const bangLabel = document.createElement('label')
  bangLabel.textContent = 'Bang Trigger (e.g., w for !w)'
  bangLabel.className = 'form-label'

  const snippetLabel = document.createElement('label')
  snippetLabel.textContent = 'Snippet (optional)'
  snippetLabel.className = 'form-label'

  const redirectLabel = document.createElement('label')
  redirectLabel.textContent = 'Redirect URL (use %s for search term)'
  redirectLabel.className = 'form-label'

  // Append elements
  li.appendChild(bangLabel)
  li.appendChild(bangInput)
  li.appendChild(snippetLabel)
  li.appendChild(snippetInput)
  li.appendChild(redirectLabel)
  li.appendChild(redirectInput)
  li.appendChild(xButton)

  return li
}

// Update the add button to use Bootstrap classes
document.getElementById('add-custom-bang').className = 'btn  mt-3'

// Initialize custom bangs
settings.get('customBangs', (value) => {
  const bangslist = document.getElementById('custom-bangs')
  bangslist.className = 'list-unstyled' // Add Bootstrap class

  if (value && Array.isArray(value)) {
    value.forEach(function(bang) {
      bangslist.appendChild(createBang(bang.phrase, bang.snippet, bang.redirect))
    })
  }
})

// Replace the showRestartRequiredBanner function
function showRestartRequiredBanner() {
  const modal = new bootstrap.Modal(document.getElementById('restart-required-banner'))
  modal.show()
  settings.set('restartNow', true)
}

// Add this after the existing settings.get('restartNow') code
document.getElementById('restart-now').addEventListener('click', function() {
  // Add your restart logic here
  postMessage({ message: 'restartNow' })
})