document.title = l('settingsPreferencesHeading') + ' | Min'

var contentTypeBlockingContainer = document.getElementById('content-type-blocking')
var clearHistoryOnStartupCheckbox = document.getElementById('checkbox-clear-history-on-startup')
var banner = document.getElementById('restart-required-banner')
var siteThemeCheckbox = document.getElementById('checkbox-site-theme')
var showDividerCheckbox = document.getElementById('checkbox-show-divider')
var userscriptsCheckbox = document.getElementById('checkbox-userscripts')
var userscriptsShowDirectorySection = document.getElementById('userscripts-show-directory')
var separateTitlebarCheckbox = document.getElementById('checkbox-separate-titlebar')
var openTabsInForegroundCheckbox = document.getElementById('checkbox-open-tabs-in-foreground')
var autoPlayCheckbox = document.getElementById('checkbox-enable-autoplay')
var searchSuggestionsCheckbox = document.getElementById('checkbox-search-suggestions')
var searchSuggestionsCountInput = document.getElementById('input-search-suggestions-count')
var userAgentCheckbox = document.getElementById('checkbox-user-agent')
var userAgentInput = document.getElementById('input-user-agent')
var searchRegionSelect = document.getElementById('search-region')
var searchLanguageSelect = document.getElementById('search-language')
var searchSafeModeSelect = document.getElementById('search-safe-mode')
var searchExtraParamsInput = document.getElementById('search-extra-params')
var searchResultsPerPageSelect = document.getElementById('search-results-per-page')
var searchTimeRangeSelect = document.getElementById('search-time-range')
var manualEngineNameInput = document.getElementById('manual-engine-name')
var manualEngineURLInput = document.getElementById('manual-engine-url')
var manualEngineSuggestURLInput = document.getElementById('manual-engine-suggest-url')
var manualEngineAddButton = document.getElementById('manual-engine-add-button')
var manualEngineFeedback = document.getElementById('manual-engine-feedback')
var manualEngineList = document.getElementById('manual-engine-list')

var dynamicThemeCheckbox = document.getElementById('checkbox-dynamic-theme')
var liquidGlassAnimationsCheckbox = document.getElementById('checkbox-liquid-glass-animations')
var comfortReadingCheckbox = document.getElementById('checkbox-comfort-reading')
var fontSizeSlider = document.getElementById('font-size-slider')
var fontSizeValue = document.getElementById('font-size-value')
var fontSpacingSlider = document.getElementById('font-spacing-slider')
var fontSpacingValue = document.getElementById('font-spacing-value')
var multiViewMaxViewsInput = document.getElementById('multi-view-max-views')
var gestureShortcutsCheckbox = document.getElementById('checkbox-gesture-shortcuts')
var gestureWorkspaceCheckbox = document.getElementById('checkbox-gesture-workspace')
var openEphemeralTabButton = document.getElementById('button-open-ephemeral-tab')
var updatesCurrentVersionInput = document.getElementById('updates-current-version')
var openUpdateLinkButton = document.getElementById('button-open-update-link')
var ntpRandomBackgroundCheckbox = document.getElementById('checkbox-ntp-random-background')
var ntpShortcutsSizeSelect = document.getElementById('select-ntp-shortcuts-size')
var ntpShowHistoryCheckbox = document.getElementById('checkbox-ntp-show-history')
var ntpShowFavoritesCheckbox = document.getElementById('checkbox-ntp-show-favorites')
var ntpFixTitleOverlapCheckbox = document.getElementById('checkbox-ntp-fix-title-overlap')
var uiDensitySelect = document.getElementById('ui-density-select')
var uiMotionIntensitySelect = document.getElementById('ui-motion-intensity-select')
var uiSurfaceReflectionsCheckbox = document.getElementById('checkbox-ui-surface-reflections')
var workflowModeSelect = document.getElementById('workflow-mode-select')
var modeBlockDistractionsCheckbox = document.getElementById('checkbox-mode-block-distractions')
var modeAutoFocusCheckbox = document.getElementById('checkbox-mode-auto-focus')
var distractionSitesInput = document.getElementById('input-distraction-sites')
var screenTimeEnabledCheckbox = document.getElementById('checkbox-screen-time-enabled')
var screenTimeWeeklyHoursInput = document.getElementById('input-screen-time-weekly-hours')
var screenTimeMonthlyHoursInput = document.getElementById('input-screen-time-monthly-hours')
var screenTimePinLockCheckbox = document.getElementById('checkbox-screen-time-pin-lock')
var cookieControlsEnabledCheckbox = document.getElementById('checkbox-cookie-controls-enabled')
var cookiePolicySelect = document.getElementById('select-cookie-policy')
var historySmartModeSelect = document.getElementById('select-history-smart-mode')
var fingerprintingProtectionSelect = document.getElementById('select-fingerprinting-protection')
var httpsUpgradeEnabledCheckbox = document.getElementById('checkbox-https-upgrade-enabled')
var tabHibernationTimeoutInput = document.getElementById('input-tab-hibernation-timeout')
var PasswordManagersAPI = require('passwordManager/passwordManager.js')

function showRestartRequiredBanner () {
  banner.hidden = false
  settings.set('restartNow', true)
}
settings.get('restartNow', (value) => {
  if (value === true) {
    showRestartRequiredBanner()
  }
})

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

/* clear history on startup setting */

settings.get('clearHistoryOnStartup', function (value) {
  if (value === true) {
    clearHistoryOnStartupCheckbox.checked = true
  }
})

clearHistoryOnStartupCheckbox.addEventListener('change', function (e) {
  settings.set('clearHistoryOnStartup', this.checked)
})


settings.get('fingerprintingProtectionLevel', function (value) {
  fingerprintingProtectionSelect.value = ['off', 'balanced', 'strict'].includes(value) ? value : 'balanced'
})

fingerprintingProtectionSelect.addEventListener('change', function () {
  const selected = ['off', 'balanced', 'strict'].includes(this.value) ? this.value : 'balanced'
  settings.set('fingerprintingProtectionLevel', selected)
})

settings.get('httpsUpgradeEnabled', function (value) {
  httpsUpgradeEnabledCheckbox.checked = value !== false
})

httpsUpgradeEnabledCheckbox.addEventListener('change', function () {
  settings.set('httpsUpgradeEnabled', this.checked)
})

settings.get('tabHibernationTimeoutMinutes', function (value) {
  let parsed = parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 240) {
    parsed = 30
  }
  tabHibernationTimeoutInput.value = parsed
})

tabHibernationTimeoutInput.addEventListener('change', function () {
  let parsed = parseInt(this.value, 10)
  if (!Number.isInteger(parsed) || parsed < 1) {
    parsed = 1
  }
  if (parsed > 240) {
    parsed = 240
  }
  this.value = parsed
  settings.set('tabHibernationTimeoutMinutes', parsed)
})


/* screen time, cookie and smart history settings */


function requestPinValidationIfNeeded (onSuccess) {
  settings.get('screenTimePinProtected', function (pinProtected) {
    if (pinProtected !== true || !PasswordManagersAPI.hasPin()) {
      onSuccess()
      return
    }

    var provided = window.prompt('Code PIN requis pour modifier le temps d’écran')
    if (!provided) {
      return
    }

    PasswordManagersAPI.verifyPin(provided).then(function (isValid) {
      if (!isValid) {
        alert('Code PIN incorrect.')
        return
      }
      onSuccess()
    })
  })
}

function normalizeScreenTimeHours (value, fallback, min, max) {
  var parsed = parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < min) {
    return fallback
  }
  if (parsed > max) {
    return max
  }
  return parsed
}

function normalizeCookiePolicy (value) {
  return ['balanced', 'strict', 'custom'].includes(value) ? value : 'balanced'
}

function normalizeHistorySmartMode (value) {
  return ['adaptive', 'private-first', 'off'].includes(value) ? value : 'adaptive'
}

settings.get('screenTimeEnabled', function (value) {
  screenTimeEnabledCheckbox.checked = value === true
})

screenTimeEnabledCheckbox.addEventListener('change', function () {
  settings.set('screenTimeEnabled', this.checked)
})

settings.get('screenTimeWeeklyHours', function (value) {
  var normalized = normalizeScreenTimeHours(value, 35, 1, 168)
  screenTimeWeeklyHoursInput.value = String(normalized)
  if (normalized !== value) {
    settings.set('screenTimeWeeklyHours', normalized)
  }
})

screenTimeWeeklyHoursInput.addEventListener('change', function () {
  var self = this
  var normalized = normalizeScreenTimeHours(this.value, 35, 1, 168)
  requestPinValidationIfNeeded(function () {
    self.value = String(normalized)
    settings.set('screenTimeWeeklyHours', normalized)
  })
})

settings.get('screenTimeMonthlyHours', function (value) {
  var normalized = normalizeScreenTimeHours(value, 140, 1, 744)
  screenTimeMonthlyHoursInput.value = String(normalized)
  if (normalized !== value) {
    settings.set('screenTimeMonthlyHours', normalized)
  }
})

screenTimeMonthlyHoursInput.addEventListener('change', function () {
  var self = this
  var normalized = normalizeScreenTimeHours(this.value, 140, 1, 744)
  requestPinValidationIfNeeded(function () {
    self.value = String(normalized)
    settings.set('screenTimeMonthlyHours', normalized)
  })
})

settings.get('screenTimePinProtected', function (value) {
  screenTimePinLockCheckbox.checked = value === true
})

screenTimePinLockCheckbox.addEventListener('change', async function () {
  if (this.checked && !localStorage.getItem('msearch.security.pinHash')) {
    this.checked = false
    alert('Veuillez d’abord configurer un code PIN dans Données personnelles.')
    return
  }
  settings.set('screenTimePinProtected', this.checked)
})

settings.get('cookieControlsEnabled', function (value) {
  cookieControlsEnabledCheckbox.checked = value !== false
})

cookieControlsEnabledCheckbox.addEventListener('change', function () {
  settings.set('cookieControlsEnabled', this.checked)
})

settings.get('cookiePolicy', function (value) {
  var normalized = normalizeCookiePolicy(value)
  cookiePolicySelect.value = normalized
  if (normalized !== value) {
    settings.set('cookiePolicy', normalized)
  }
})

cookiePolicySelect.addEventListener('change', function () {
  var normalized = normalizeCookiePolicy(this.value)
  this.value = normalized
  settings.set('cookiePolicy', normalized)
})

settings.get('historySmartMode', function (value) {
  var normalized = normalizeHistorySmartMode(value)
  historySmartModeSelect.value = normalized
  if (normalized !== value) {
    settings.set('historySmartMode', normalized)
  }
})

historySmartModeSelect.addEventListener('change', function () {
  var normalized = normalizeHistorySmartMode(this.value)
  this.value = normalized
  settings.set('historySmartMode', normalized)
})

/* workflow modes and distractions settings */

function normalizeWorkflowMode (value) {
  return ['work', 'study', 'deep-focus', 'relax', 'custom'].includes(value) ? value : 'work'
}

function normalizeDistractionDomains (value) {
  if (!value) {
    return []
  }

  return value.split(',').map(item => item.trim().replace('http://', '').replace('https://', '').replace(/\/.*$/, '').toLowerCase()).filter(Boolean)
}

settings.get('workflowMode', function (value) {
  var normalized = normalizeWorkflowMode(value)
  workflowModeSelect.value = normalized
  if (normalized !== value) {
    settings.set('workflowMode', normalized)
  }
})

workflowModeSelect.addEventListener('change', function () {
  var normalized = normalizeWorkflowMode(this.value)
  this.value = normalized
  settings.set('workflowMode', normalized)
})

settings.get('modeBlockDistractions', function (value) {
  modeBlockDistractionsCheckbox.checked = value === true
})

modeBlockDistractionsCheckbox.addEventListener('change', function () {
  settings.set('modeBlockDistractions', this.checked)
})

settings.get('modeAutoFocus', function (value) {
  modeAutoFocusCheckbox.checked = value === true
})

modeAutoFocusCheckbox.addEventListener('change', function () {
  settings.set('modeAutoFocus', this.checked)
})

settings.get('distractionSites', function (value) {
  if (Array.isArray(value) && value.length) {
    distractionSitesInput.value = value.join(', ')
    return
  }
  distractionSitesInput.value = 'youtube.com, x.com, reddit.com'
  if (!Array.isArray(value)) {
    settings.set('distractionSites', ['youtube.com', 'x.com', 'reddit.com'])
  }
})

distractionSitesInput.addEventListener('change', function () {
  var normalized = normalizeDistractionDomains(this.value)
  this.value = normalized.join(', ')
  settings.set('distractionSites', normalized)
})

/* dark mode setting */
var darkModeNever = document.getElementById('dark-mode-never')
var darkModeNight = document.getElementById('dark-mode-night')
var darkModeAlways = document.getElementById('dark-mode-always')
var darkModeSystem = document.getElementById('dark-mode-system')

// -1 - off ; 0 - auto ; 1 - on
settings.get('darkMode', function (value) {
  darkModeNever.checked = (value === -1)
  darkModeNight.checked = (value === 0)
  darkModeAlways.checked = (value === 1 || value === true)
  darkModeSystem.checked = (value === 2 || value === undefined || value === false)
})

darkModeNever.addEventListener('change', function (e) {
  if (this.checked) {
    settings.set('darkMode', -1)
  }
})
darkModeNight.addEventListener('change', function (e) {
  if (this.checked) {
    settings.set('darkMode', 0)
  }
})
darkModeAlways.addEventListener('change', function (e) {
  if (this.checked) {
    settings.set('darkMode', 1)
  }
})
darkModeSystem.addEventListener('change', function (e) {
  if (this.checked) {
    settings.set('darkMode', 2)
  }
})

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

settings.get('startupTabOption', function (value = 2) {
  startupSettingInput.value = value
})

startupSettingInput.addEventListener('change', function () {
  settings.set('startupTabOption', parseInt(this.value))
})

/* new window settings */

var newWindowSettingInput = document.getElementById('new-window-options')

settings.get('newWindowOption', function (value = 1) {
  newWindowSettingInput.value = value
})

newWindowSettingInput.addEventListener('change', function () {
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

userscriptsShowDirectorySection.getElementsByTagName('a')[0].addEventListener('click', function () {
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

/* bookmarks bar setting */

var showBookmarksBarCheckbox = document.getElementById('checkbox-show-bookmarks-bar')

settings.get('showBookmarksBar', function (value) {
  if (value === true) {
    showBookmarksBarCheckbox.checked = true
  }
})

showBookmarksBarCheckbox.addEventListener('change', function (e) {
  settings.set('showBookmarksBar', this.checked)
})

/* language setting */

var languagePicker = document.getElementById('setting-language-picker')

for (var language in languages) { // from localization.build.js
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

/* search suggestions settings */

settings.get('searchSuggestionsEnabled', function (value) {
  if (value === false) {
    searchSuggestionsCheckbox.checked = false
  } else {
    searchSuggestionsCheckbox.checked = true
  }
})

searchSuggestionsCheckbox.addEventListener('change', function () {
  settings.set('searchSuggestionsEnabled', this.checked)
})

settings.get('searchSuggestionsCount', function (value) {
  var parsedValue = Number.parseInt(value, 10)

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 8) {
    parsedValue = 3
  }

  searchSuggestionsCountInput.value = parsedValue

  if (parsedValue !== value) {
    settings.set('searchSuggestionsCount', parsedValue)
  }
})

searchSuggestionsCountInput.addEventListener('change', function () {
  var parsedValue = Number.parseInt(this.value, 10)

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    parsedValue = 1
  } else if (parsedValue > 8) {
    parsedValue = 8
  }

  this.value = parsedValue
  settings.set('searchSuggestionsCount', parsedValue)
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
  const value = this.value.slice(0, 200)
  if (value !== this.value) {
    this.value = value
  }
  if (value) {
    settings.set('customUserAgent', value)
  } else {
    settings.set('customUserAgent', null)
  }
  showRestartRequiredBanner()
})

/* multi-view and gesture settings */

settings.get('multiViewMaxViews', function (value) {
  multiViewMaxViewsInput.value = String(value || 1)
})

multiViewMaxViewsInput.addEventListener('change', function () {
  settings.set('multiViewMaxViews', parseInt(this.value) || 1)
})

settings.get('gestureShortcutsEnabled', function (value) {
  gestureShortcutsCheckbox.checked = value === true
})

gestureShortcutsCheckbox.addEventListener('change', function () {
  settings.set('gestureShortcutsEnabled', this.checked)
})

settings.get('gestureWorkspaceSwipeEnabled', function (value) {
  gestureWorkspaceCheckbox.checked = value !== false
})

gestureWorkspaceCheckbox.addEventListener('change', function () {
  settings.set('gestureWorkspaceSwipeEnabled', this.checked)
})

openEphemeralTabButton.addEventListener('click', function () {
  postMessage({ message: 'open-ephemeral-tab', url: 'min://newtab' })
})


if (updatesCurrentVersionInput) {
  updatesCurrentVersionInput.value = '26.7.8'
}

if (openUpdateLinkButton) {
  openUpdateLinkButton.addEventListener('click', function () {
    window.open('https://gemini.google.com/share/231346c724a6', '_blank', 'noopener')
  })
}

settings.get('ntpRandomBackgroundEnabled', function (value) {
  ntpRandomBackgroundCheckbox.checked = value !== false
})

ntpRandomBackgroundCheckbox.addEventListener('change', function () {
  settings.set('ntpRandomBackgroundEnabled', this.checked)
})

settings.get('ntpMaxShortcuts', function (value) {
  var safe = parseInt(value, 10)
  if (![4, 6, 8, 10, 12].includes(safe)) {
    safe = 8
  }
  ntpShortcutsSizeSelect.value = String(safe)
})

ntpShortcutsSizeSelect.addEventListener('change', function () {
  var safe = parseInt(this.value, 10)
  if (![4, 6, 8, 10, 12].includes(safe)) {
    safe = 8
  }
  settings.set('ntpMaxShortcuts', safe)
})

settings.get('ntpShowHistory', function (value) {
  ntpShowHistoryCheckbox.checked = value !== false
})

ntpShowHistoryCheckbox.addEventListener('change', function () {
  settings.set('ntpShowHistory', this.checked)
})

settings.get('ntpShowFavorites', function (value) {
  ntpShowFavoritesCheckbox.checked = value !== false
})

ntpShowFavoritesCheckbox.addEventListener('change', function () {
  settings.set('ntpShowFavorites', this.checked)
})

settings.get('ntpFixTitleOverlap', function (value) {
  ntpFixTitleOverlapCheckbox.checked = value !== false
})

ntpFixTitleOverlapCheckbox.addEventListener('change', function () {
  settings.set('ntpFixTitleOverlap', this.checked)
})

/* dynamic theme, animations and font preferences */

function updateFontDisplay () {
  fontSizeValue.textContent = (parseInt(fontSizeSlider.value) || 100) + '%'
  fontSpacingValue.textContent = (parseFloat(fontSpacingSlider.value) || 0).toFixed(2) + 'px'
}

settings.get('dynamicThemeEnabled', function (value) {
  dynamicThemeCheckbox.checked = value === true
})

dynamicThemeCheckbox.addEventListener('change', function () {
  settings.set('dynamicThemeEnabled', this.checked)
})

settings.get('liquidGlassAnimations', function (value) {
  liquidGlassAnimationsCheckbox.checked = value !== false
})

liquidGlassAnimationsCheckbox.addEventListener('change', function () {
  settings.set('liquidGlassAnimations', this.checked)
})

settings.get('comfortReadingMode', function (value) {
  comfortReadingCheckbox.checked = value === true
})

comfortReadingCheckbox.addEventListener('change', function () {
  settings.set('comfortReadingMode', this.checked)
})

settings.get('uiFontScale', function (value) {
  fontSizeSlider.value = String(value || 100)
  updateFontDisplay()
})

fontSizeSlider.addEventListener('input', function () {
  settings.set('uiFontScale', parseInt(this.value) || 100)
  updateFontDisplay()
})

settings.get('uiLetterSpacing', function (value) {
  var parsed = typeof value === 'number' ? value : 0
  fontSpacingSlider.value = String(parsed)
  updateFontDisplay()
})

fontSpacingSlider.addEventListener('input', function () {
  settings.set('uiLetterSpacing', parseFloat(this.value) || 0)
  updateFontDisplay()
})


/* experience settings */

function normalizeUIDensity (value) {
  var allowed = ['comfortable', 'compact', 'spacious']
  return allowed.indexOf(value) !== -1 ? value : 'comfortable'
}

function normalizeUIMotionIntensity (value) {
  var allowed = ['soft', 'normal', 'vivid']
  return allowed.indexOf(value) !== -1 ? value : 'normal'
}


function applyExperienceClasses (density, motion, surfaceReflections) {
  document.body.classList.remove('ui-density-comfortable', 'ui-density-compact', 'ui-density-spacious')
  document.body.classList.remove('ui-motion-soft', 'ui-motion-normal', 'ui-motion-vivid')

  document.body.classList.add('ui-density-' + density)
  document.body.classList.add('ui-motion-' + motion)
  document.body.classList.toggle('ui-surface-reflections-off', surfaceReflections === false)
}

function syncExperiencePreview () {
  applyExperienceClasses(
    normalizeUIDensity(uiDensitySelect.value),
    normalizeUIMotionIntensity(uiMotionIntensitySelect.value),
    uiSurfaceReflectionsCheckbox.checked
  )
}

settings.get('uiDensity', function (value) {
  uiDensitySelect.value = normalizeUIDensity(value)
  syncExperiencePreview()
})

uiDensitySelect.addEventListener('change', function () {
  var normalized = normalizeUIDensity(this.value)
  this.value = normalized
  settings.set('uiDensity', normalized)
  syncExperiencePreview()
})

settings.get('uiMotionIntensity', function (value) {
  uiMotionIntensitySelect.value = normalizeUIMotionIntensity(value)
  syncExperiencePreview()
})

uiMotionIntensitySelect.addEventListener('change', function () {
  var normalized = normalizeUIMotionIntensity(this.value)
  this.value = normalized
  settings.set('uiMotionIntensity', normalized)
  syncExperiencePreview()
})

settings.get('uiSurfaceReflections', function (value) {
  uiSurfaceReflectionsCheckbox.checked = value !== false
  syncExperiencePreview()
})

uiSurfaceReflectionsCheckbox.addEventListener('change', function () {
  settings.set('uiSurfaceReflections', this.checked)
  syncExperiencePreview()
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

var searchEngineChoiceSelect = document.getElementById('search-engine-choice')
var maiSidebarEnabledCheckbox = document.getElementById('checkbox-mai-sidebar-enabled')
var maiSidebarPositionSelect = document.getElementById('mai-sidebar-position')

function normalizeSearchEngineOptions (value) {
  var defaults = {
    region: 'fr-FR',
    language: 'fr',
    safeMode: 'moderate',
    extraParams: '',
    resultsPerPage: 'default',
    timeRange: 'any'
  }

  if (!value || typeof value !== 'object') {
    return defaults
  }

  return {
    region: value.region || defaults.region,
    language: value.language || defaults.language,
    safeMode: value.safeMode || defaults.safeMode,
    extraParams: typeof value.extraParams === 'string' ? value.extraParams.trim() : '',
    resultsPerPage: ['default', '10', '20', '50'].includes(String(value.resultsPerPage)) ? String(value.resultsPerPage) : defaults.resultsPerPage,
    timeRange: ['any', 'day', 'week', 'month', 'year'].includes(String(value.timeRange)) ? String(value.timeRange) : defaults.timeRange
  }
}

function saveSearchEngineOptions () {
  settings.set('searchEngineOptions', {
    region: searchRegionSelect.value,
    language: searchLanguageSelect.value,
    safeMode: searchSafeModeSelect.value,
    extraParams: (searchExtraParamsInput.value || '').trim(),
    resultsPerPage: searchResultsPerPageSelect.value,
    timeRange: searchTimeRangeSelect.value
  })
}

function sanitizeManualEngineInput (item) {
  if (!item || typeof item !== 'object') {
    return null
  }

  var name = (item.name || '').trim()
  var searchURL = (item.searchURL || '').trim()
  var suggestionsURL = (item.suggestionsURL || '').trim()

  if (!name || !searchURL || !searchURL.includes('%s')) {
    return null
  }

  return {
    name: name,
    searchURL: searchURL,
    suggestionsURL: suggestionsURL
  }
}

function setManualEngineFeedback (message, isError) {
  manualEngineFeedback.textContent = message
  manualEngineFeedback.style.color = isError ? '#dc2626' : ''
}

function normalizeManualSearchEngines (value) {
  if (!Array.isArray(value)) {
    return []
  }

  var result = []
  var seen = new Set()

  value.forEach(function (item) {
    var safeItem = sanitizeManualEngineInput(item)
    if (!safeItem) {
      return
    }
    var uniqueKey = safeItem.name.toLowerCase()
    if (seen.has(uniqueKey)) {
      return
    }
    seen.add(uniqueKey)
    result.push(safeItem)
  })

  return result
}

function renderManualEngineList (items) {
  empty(manualEngineList)

  items.forEach(function (item, index) {
    var li = document.createElement('li')
    li.className = 'manual-engine-list-item'

    var text = document.createElement('span')
    text.textContent = item.name + ' — ' + item.searchURL

    var removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className = 'settings-action-button manual-engine-remove-button'
    removeButton.textContent = 'Supprimer'
    removeButton.addEventListener('click', function () {
      var updated = items.slice(0, index).concat(items.slice(index + 1))
      settings.set('customSearchEngines', updated)
      setManualEngineFeedback('Moteur supprimé.', false)
    })

    li.appendChild(text)
    li.appendChild(removeButton)
    manualEngineList.appendChild(li)
  })
}

function setupManualSearchEngineManagement () {
  settings.get('customSearchEngines', function (value) {
    var safeItems = normalizeManualSearchEngines(value)
    renderManualEngineList(safeItems)
    if (JSON.stringify(safeItems) !== JSON.stringify(value || [])) {
      settings.set('customSearchEngines', safeItems)
    }
  })

  manualEngineAddButton.addEventListener('click', function () {
    var nextItem = sanitizeManualEngineInput({
      name: manualEngineNameInput.value,
      searchURL: manualEngineURLInput.value,
      suggestionsURL: manualEngineSuggestURLInput.value
    })

    if (!nextItem) {
      setManualEngineFeedback('Moteur invalide : nom et URL contenant %s requis.', true)
      return
    }

    settings.get('customSearchEngines', function (value) {
      var safeItems = normalizeManualSearchEngines(value)
      var exists = safeItems.some(function (item) {
        return item.name.toLowerCase() === nextItem.name.toLowerCase()
      })

      if (exists) {
        setManualEngineFeedback('Ce nom de moteur existe déjà.', true)
        return
      }

      safeItems.push(nextItem)
      settings.set('customSearchEngines', safeItems)
      settings.set('searchEngine', { name: nextItem.name })
      manualEngineNameInput.value = ''
      manualEngineURLInput.value = ''
      manualEngineSuggestURLInput.value = ''
      setManualEngineFeedback('Moteur ajouté et activé.', false)
    })
  })

  settings.listen('customSearchEngines', function (value) {
    var safeItems = normalizeManualSearchEngines(value)
    renderManualEngineList(safeItems)
  })
}

settings.onLoad(function () {
  var activeEngine = currentSearchEngine && currentSearchEngine.name ? currentSearchEngine.name : 'DuckDuckGo'
  setupManualSearchEngineManagement()

  if (searchEngineChoiceSelect) {
    if (searchEngines[activeEngine]) {
      searchEngineChoiceSelect.value = activeEngine
    }

    settings.get('searchEngine', function (value) {
      if (value && value.name && searchEngines[value.name]) {
        searchEngineChoiceSelect.value = value.name
      }
    })
  }
})

if (searchEngineChoiceSelect) {
  searchEngineChoiceSelect.addEventListener('change', function () {
    if (searchEngines[this.value]) {
      settings.set('searchEngine', { name: this.value })
    }
  })
}

settings.get('maiSidebarEnabled', function (value) {
  if (maiSidebarEnabledCheckbox) {
    maiSidebarEnabledCheckbox.checked = value !== false
  }
})

if (maiSidebarEnabledCheckbox) {
  maiSidebarEnabledCheckbox.addEventListener('change', function () {
    settings.set('maiSidebarEnabled', this.checked)
  })
}

function normalizeMaiSidebarPosition (value) {
  return value === 'left' ? 'left' : 'right'
}

settings.get('maiSidebarPosition', function (value) {
  if (maiSidebarPositionSelect) {
    maiSidebarPositionSelect.value = normalizeMaiSidebarPosition(value)
  }
})

if (maiSidebarPositionSelect) {
  maiSidebarPositionSelect.addEventListener('change', function () {
    var normalized = normalizeMaiSidebarPosition(this.value)
    this.value = normalized
    settings.set('maiSidebarPosition', normalized)
  })
}

settings.get('searchEngineOptions', function (value) {
  var safeOptions = normalizeSearchEngineOptions(value)
  searchRegionSelect.value = safeOptions.region
  searchLanguageSelect.value = safeOptions.language
  searchSafeModeSelect.value = safeOptions.safeMode
  searchExtraParamsInput.value = safeOptions.extraParams
  searchResultsPerPageSelect.value = safeOptions.resultsPerPage
  searchTimeRangeSelect.value = safeOptions.timeRange
})

settings.listen('customSearchEngines', function () {
  if (!searchEngineChoiceSelect) {
    return
  }

  var selectedValue = searchEngineChoiceSelect.value
  var availableEngines = Object.keys(searchEngines)

  if (!availableEngines.includes(selectedValue)) {
    var fallback = currentSearchEngine && searchEngines[currentSearchEngine.name] ? currentSearchEngine.name : 'DuckDuckGo'
    searchEngineChoiceSelect.value = searchEngines[fallback] ? fallback : availableEngines[0]
  }
})

searchRegionSelect.addEventListener('change', saveSearchEngineOptions)
searchLanguageSelect.addEventListener('change', saveSearchEngineOptions)
searchSafeModeSelect.addEventListener('change', saveSearchEngineOptions)
searchExtraParamsInput.addEventListener('input', saveSearchEngineOptions)
searchResultsPerPageSelect.addEventListener('change', saveSearchEngineOptions)
searchTimeRangeSelect.addEventListener('change', saveSearchEngineOptions)

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
  const newListItem = createBang()
  bangslist.appendChild(newListItem)
  document.body.scrollBy(0, Math.round(newListItem.getBoundingClientRect().height))
})

function createBang (bang, snippet, redirect) {
  var li = document.createElement('li')
  var bangInput = document.createElement('input')
  var snippetInput = document.createElement('input')
  var redirectInput = document.createElement('input')
  var xButton = document.createElement('button')
  var current = { phrase: bang ?? '', snippet: snippet ?? '', redirect: redirect ?? '' }
  function update (key, input) {
    settings.get('customBangs', function (d) {
      const filtered = d ? d.filter((bang) => bang.phrase !== current.phrase && (key !== 'phrase' || bang.phrase !== input.value)) : []
      filtered.push({ phrase: bangInput.value, snippet: snippetInput.value, redirect: redirectInput.value })
      settings.set('customBangs', filtered)
      current[key] = input.value
    })
  }

  bangInput.type = 'text'
  snippetInput.type = 'text'
  redirectInput.type = 'text'
  bangInput.value = bang ?? ''
  snippetInput.value = snippet ?? ''
  redirectInput.value = redirect ?? ''
  xButton.className = 'i carbon:close custom-bang-delete-button'

  bangInput.placeholder = l('settingsCustomBangsPhrase')
  snippetInput.placeholder = l('settingsCustomBangsSnippet')
  redirectInput.placeholder = l('settingsCustomBangsRedirect')
  xButton.addEventListener('click', function () {
    li.remove()
    settings.get('customBangs', (d) => {
      settings.set('customBangs', d.filter((bang) => bang.phrase !== bangInput.value))
    })
    showRestartRequiredBanner()
  })

  bangInput.addEventListener('change', function () {
    if (this.value.startsWith('!')) {
      this.value = this.value.slice(1)
    }
    update('phrase', bangInput)
    showRestartRequiredBanner()
  })
  snippetInput.addEventListener('change', function () {
    update('snippet', snippetInput)
    showRestartRequiredBanner()
  })
  redirectInput.addEventListener('change', function () {
    update('redirect', redirectInput)
    showRestartRequiredBanner()
  })

  li.appendChild(bangInput)
  li.appendChild(snippetInput)
  li.appendChild(redirectInput)
  li.appendChild(xButton)

  return li
}

/* Personal Data & PIN Logic */

const PersonalData = {
  isUnlocked: false,
  sanitizeText: function (value, maxLen) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized) {
      return ''
    }
    if (!maxLen || normalized.length <= maxLen) {
      return normalized
    }
    return normalized.slice(0, maxLen)
  },
  isStrongPin: function (pin) {
    if (!/^\d{4,12}$/.test(pin)) {
      return false
    }

    if (/^(\d)+$/.test(pin)) {
      return false
    }

    if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) {
      return false
    }

    return true
  },
  sanitizeCardNumber: function (value) {
    return String(value || '').replace(/[^\d]/g, '').slice(0, 19)
  },
  isValidExpiry: function (value) {
    const clean = String(value || '').trim()
    if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(clean)) {
      return false
    }

    const now = new Date()
    const parts = clean.split('/')
    const month = parseInt(parts[0], 10)
    const year = 2000 + parseInt(parts[1], 10)
    const expiryDate = new Date(year, month, 0, 23, 59, 59, 999)
    return expiryDate >= new Date(now.getFullYear(), now.getMonth(), 1)
  },
  isValidPhone: function (value) {
    if (!value) {
      return true
    }
    return /^\+?[\d\s().-]{6,20}$/.test(value)
  },
  isValidEmail: function (value) {
    if (!value) {
      return true
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
  updatePinUI: function () {
    const hasPin = PasswordManagersAPI.hasPin()
    document.getElementById('setup-pin-button').hidden = hasPin
    document.getElementById('change-pin-button').hidden = !hasPin
    document.getElementById('remove-pin-button').hidden = !hasPin
  },
  updateSensitiveLockUI: function () {
    const status = document.getElementById('personal-data-lock-status')
    const unlockButton = document.getElementById('unlock-sensitive-data-button')
    const lockButton = document.getElementById('lock-sensitive-data-button')
    const mask = document.getElementById('personal-data-mask')

    if (!status || !unlockButton || !lockButton || !mask) {
      return
    }

    if (this.isUnlocked) {
      status.textContent = 'Coffre-fort déverrouillé (session locale uniquement)'
      unlockButton.hidden = true
      lockButton.hidden = false
      mask.hidden = true
      document.body.classList.add('sensitive-data-unlocked')
    } else {
      status.textContent = 'Coffre-fort verrouillé : données masquées'
      unlockButton.hidden = false
      lockButton.hidden = true
      mask.hidden = false
      document.body.classList.remove('sensitive-data-unlocked')
    }
  },
  ensureUnlocked: async function () {
    if (this.isUnlocked) {
      return true
    }

    if (!PasswordManagersAPI.hasPin()) {
      alert('Configurez un code PIN avant de gérer des données sensibles.')
      return false
    }

    const provided = window.prompt('Ré-authentification locale requise (PIN)')
    if (!provided) {
      return false
    }

    const unlocked = await PasswordManagersAPI.unlockPersonalData(provided)
    if (!unlocked) {
      alert('Code PIN incorrect.')
      return false
    }

    this.isUnlocked = true
    this.updateSensitiveLockUI()
    return true
  },
  renderAddresses: async function () {
    const list = document.getElementById('addresses-list')
    if (!list) return
    list.innerHTML = ''

    if (!this.isUnlocked) {
      return
    }

    let addresses = []
    try {
      addresses = await PasswordManagersAPI.getAddresses()
    } catch (e) {
      console.error('Failed to decrypt addresses', e)
    }

    addresses.forEach(addr => {
      const li = document.createElement('li')
      li.className = 'data-list-item'

      const content = document.createElement('div')
      content.className = 'data-list-content'

      const title = document.createElement('span')
      title.className = 'data-list-title'
      title.textContent = addr.name || 'Sans nom'

      const subtitle = document.createElement('span')
      subtitle.className = 'data-list-subtitle'
      subtitle.textContent = `${addr.address || ''}, ${addr.city || ''}`

      const button = document.createElement('button')
      button.className = 'settings-action-button delete-data-btn'
      button.textContent = 'Supprimer'
      button.setAttribute('data-id', String(addr.id || ''))
      button.setAttribute('data-type', 'address')

      content.appendChild(title)
      content.appendChild(subtitle)
      li.appendChild(content)
      li.appendChild(button)
      list.appendChild(li)
    })
  },
  renderCards: async function () {
    const list = document.getElementById('cards-list')
    if (!list) return
    list.innerHTML = ''

    if (!this.isUnlocked) {
      return
    }

    let cards = []
    try {
      cards = await PasswordManagersAPI.getCards()
    } catch (e) {
      console.error('Failed to decrypt cards', e)
    }

    cards.forEach(card => {
      const last4 = card.number ? card.number.slice(-4) : '????'
      const li = document.createElement('li')
      li.className = 'data-list-item'

      const content = document.createElement('div')
      content.className = 'data-list-content'

      const title = document.createElement('span')
      title.className = 'data-list-title'
      title.textContent = card.name || 'Carte'

      const subtitle = document.createElement('span')
      subtitle.className = 'data-list-subtitle'
      subtitle.textContent = '•••• ' + last4 + ' (Exp: ' + (card.expiry || '') + ')'

      const button = document.createElement('button')
      button.className = 'settings-action-button delete-data-btn'
      button.textContent = 'Supprimer'
      button.setAttribute('data-id', String(card.id || ''))
      button.setAttribute('data-type', 'card')

      content.appendChild(title)
      content.appendChild(subtitle)
      li.appendChild(content)
      li.appendChild(button)
      list.appendChild(li)
    })
  },
  openEditor: async function (type) {
    if (type === 'address' || type === 'card') {
      const unlocked = await this.ensureUnlocked()
      if (!unlocked) {
        return
      }
    }

    const modal = document.getElementById('personal-data-editor')
    const form = document.getElementById('personal-data-form')
    const title = document.getElementById('personal-data-editor-title')

    form.innerHTML = ''
    form.setAttribute('data-type', type)

    if (type === 'address') {
      title.textContent = 'Ajouter une adresse'
      form.innerHTML = `
        <input name="name" placeholder="Nom complet" required>
        <input name="address" placeholder="Adresse" required>
        <input name="city" placeholder="Ville" required>
        <input name="zip" placeholder="Code postal" required>
        <input name="country" placeholder="Pays" required>
        <input name="phone" placeholder="Téléphone">
        <input name="email" placeholder="Email" type="email">
      `
    } else if (type === 'card') {
      title.textContent = 'Ajouter une carte'
      form.innerHTML = `
        <input name="name" placeholder="Nom sur la carte" required>
        <input name="number" placeholder="Numéro de carte" required maxlength="19">
        <input name="expiry" placeholder="MM/YY" required maxlength="5">
        <input name="cvv" placeholder="CVV" maxlength="4">
      `
    } else if (type === 'pin-setup') {
      title.textContent = 'Configurer le code PIN'
      form.innerHTML = `
        <input name="pin1" type="password" placeholder="Nouveau code PIN" required autofocus>
        <input name="pin2" type="password" placeholder="Confirmer le code PIN" required>
      `
    } else if (type === 'pin-change') {
      title.textContent = 'Changer le code PIN'
      form.innerHTML = `
        <input name="current" type="password" placeholder="Code PIN actuel" required autofocus>
        <input name="pin1" type="password" placeholder="Nouveau code PIN" required>
        <input name="pin2" type="password" placeholder="Confirmer le code PIN" required>
      `
    } else if (type === 'pin-remove') {
      title.textContent = 'Supprimer le code PIN'
      form.innerHTML = `
        <input name="current" type="password" placeholder="Code PIN actuel" required autofocus>
        <p style="margin-top:0.5em; opacity:0.8">Le verrouillage au démarrage sera désactivé.</p>
      `
    }

    modal.hidden = false
    const firstInput = form.querySelector('input')
    if (firstInput) firstInput.focus()
  },
  closeEditor: function () {
    document.getElementById('personal-data-editor').hidden = true
  },
  luhnCheck: function (val) {
    let sum = 0
    let shouldDouble = false
    val = val.replace(/\s+/g, '')
    for (let i = val.length - 1; i >= 0; i--) {
      let digit = parseInt(val.charAt(i))
      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9
      }
      sum += digit
      shouldDouble = !shouldDouble
    }
    return (sum % 10) === 0
  }
}

// Bindings
document.getElementById('setup-pin-button').addEventListener('click', () => PersonalData.openEditor('pin-setup'))
document.getElementById('change-pin-button').addEventListener('click', () => PersonalData.openEditor('pin-change'))
document.getElementById('remove-pin-button').addEventListener('click', () => PersonalData.openEditor('pin-remove'))
document.getElementById('add-address-button').addEventListener('click', () => PersonalData.openEditor('address'))
document.getElementById('add-card-button').addEventListener('click', () => PersonalData.openEditor('card'))
document.getElementById('unlock-sensitive-data-button').addEventListener('click', async () => {
  const unlocked = await PersonalData.ensureUnlocked()
  if (unlocked) {
    await PersonalData.renderAddresses()
    await PersonalData.renderCards()
  }
})
document.getElementById('lock-sensitive-data-button').addEventListener('click', () => {
  PasswordManagersAPI.lockPersonalData()
  PersonalData.isUnlocked = false
  PersonalData.updateSensitiveLockUI()
  PersonalData.renderAddresses()
  PersonalData.renderCards()
})

document.getElementById('personal-data-cancel').addEventListener('click', (e) => {
  e.preventDefault()
  PersonalData.closeEditor()
})

document.getElementById('personal-data-save').addEventListener('click', async (e) => {
  e.preventDefault()
  const form = document.getElementById('personal-data-form')
  const type = form.getAttribute('data-type')

  const data = { id: Date.now().toString() }
  const inputs = form.querySelectorAll('input')
  let valid = true
  inputs.forEach(input => {
    if (input.hasAttribute('required') && !input.value.trim()) valid = false
    data[input.name] = input.value.trim()
  })

  if (!valid) {
    alert('Veuillez remplir tous les champs obligatoires.')
    return
  }

  if (type === 'pin-setup' || type === 'pin-change') {
    if (data.pin1 !== data.pin2) {
      alert('Les codes PIN ne correspondent pas.')
      return
    }

    if (!PersonalData.isStrongPin(data.pin1)) {
      alert('PIN trop faible. Utilisez 4 à 12 chiffres, non répétitifs et non séquentiels.')
      return
    }
  }

  if (type === 'pin-change' || type === 'pin-remove') {
    const isCurrentPinValid = await PasswordManagersAPI.verifyPin(data.current)
    if (!isCurrentPinValid) {
      alert('Code PIN actuel incorrect.')
      return
    }
  }

  if (type === 'pin-setup' || type === 'pin-change') {
    await PasswordManagersAPI.setPin(data.pin1)
    await PasswordManagersAPI.unlockPersonalData(data.pin1)
    PersonalData.isUnlocked = true
    PersonalData.updatePinUI()
    PersonalData.updateSensitiveLockUI()
    PersonalData.closeEditor()
    return
  }

  if (type === 'pin-remove') {
    await PasswordManagersAPI.removePin()
    PersonalData.isUnlocked = false
    PersonalData.updatePinUI()
    PersonalData.updateSensitiveLockUI()
    PersonalData.closeEditor()
    return
  }

  if (!PersonalData.isUnlocked) {
    alert('Coffre-fort verrouillé. Déverrouillez avant de modifier les données.')
    return
  }

  if (type === 'card') {
    data.name = PersonalData.sanitizeText(data.name, 80)
    data.number = PersonalData.sanitizeCardNumber(data.number)
    data.expiry = PersonalData.sanitizeText(data.expiry, 5)
    data.cvv = String(data.cvv || '').replace(/[^\d]/g, '').slice(0, 4)

    if (!PersonalData.luhnCheck(data.number)) {
      alert('Numéro de carte invalide.')
      return
    }

    if (!PersonalData.isValidExpiry(data.expiry)) {
      alert('Date d’expiration invalide. Utilisez le format MM/YY.')
      return
    }

    if (data.cvv && !/^\d{3,4}$/.test(data.cvv)) {
      alert('CVV invalide.')
      return
    }
  }

  if (type === 'address') {
    data.name = PersonalData.sanitizeText(data.name, 120)
    data.address = PersonalData.sanitizeText(data.address, 200)
    data.city = PersonalData.sanitizeText(data.city, 120)
    data.zip = PersonalData.sanitizeText(data.zip, 20)
    data.country = PersonalData.sanitizeText(data.country, 120)
    data.phone = PersonalData.sanitizeText(data.phone, 30)
    data.email = PersonalData.sanitizeText(data.email, 120)

    if (!PersonalData.isValidPhone(data.phone)) {
      alert('Numéro de téléphone invalide.')
      return
    }

    if (!PersonalData.isValidEmail(data.email)) {
      alert('Adresse email invalide.')
      return
    }
  }

  if (type === 'address') {
    await PasswordManagersAPI.saveAddress(data)
    await PersonalData.renderAddresses()
  } else if (type === 'card') {
    delete data.cvv
    await PasswordManagersAPI.saveCard(data)
    await PersonalData.renderCards()
  }

  PersonalData.closeEditor()
})

document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete-data-btn')) {
    const id = e.target.getAttribute('data-id')
    const type = e.target.getAttribute('data-type')

    if (!confirm('Supprimer cet élément ?')) return

    if (type === 'address') {
      await PasswordManagersAPI.deleteAddress(id)
      await PersonalData.renderAddresses()
    } else if (type === 'card') {
      await PasswordManagersAPI.deleteCard(id)
      await PersonalData.renderCards()
    }
  }
})

PersonalData.updatePinUI()
PersonalData.updateSensitiveLockUI()
PersonalData.renderAddresses()
PersonalData.renderCards()
