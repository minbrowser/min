var settings = require('util/settings/settings.js')
var webviews = require('webviews.js')

/* ─── Stop words ─────────────────────────────────────────────────────────── */

var STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'for', 'to', 'of', 'and', 'or',
  'in', 'on', 'at', 'with', 'it', 'this', 'that', 'by', 'from', 'be',
  'as', 'how', 'what', 'about', 'i', 'my', 'me'
])

/* ─── Tokenizer ──────────────────────────────────────────────────────────── */

function tokenize (text) {
  if (!text) return []
  var words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(function (w) { return w.length > 1 && !STOP_WORDS.has(w) })

  var bigrams = []
  for (var i = 0; i < words.length - 1; i++) {
    bigrams.push(words[i] + ' ' + words[i + 1])
  }
  return words.concat(bigrams)
}

/* ─── Relevance scorer ───────────────────────────────────────────────────── */

function scoreRelevance (signals, goalTokens) {
  var combined = signals.join(' ').toLowerCase()
  var score = 0
  goalTokens.forEach(function (token) {
    if (combined.indexOf(token) !== -1) score++
  })
  return score
}

/* ─── Session state ──────────────────────────────────────────────────────── */

var state = {
  enabled: false,
  goal: '',
  goalTokens: [],
  sessionStart: null,
  consecutiveOffTopic: 0,
  lastAlertTime: 0,
  offTopicSeconds: 0,
  offTopicStartTime: null,
  currentPageOnTopic: true,
  driftAlerts: 0,
  samplingInterval: null,
  timerInterval: null,
  windowFocused: true,
  sessionRestoreComplete: false
}

/* ─── UI element references ──────────────────────────────────────────────── */

var ui = {}

function getUIElements () {
  ui.indicator = document.getElementById('focus-mode-indicator')
  ui.goalModal = document.getElementById('focus-mode-goal-modal')
  ui.goalInput = document.getElementById('focus-mode-goal-input')
  ui.alertBar = document.getElementById('focus-mode-alert')
  ui.alertGoal = document.getElementById('focus-alert-goal')
  ui.summaryModal = document.getElementById('focus-mode-summary')
  ui.summaryTotal = document.getElementById('focus-summary-total')
  ui.summaryOnTopic = document.getElementById('focus-summary-ontopic')
  ui.summaryOffTopic = document.getElementById('focus-summary-offtopic')
  ui.summaryAlerts = document.getElementById('focus-summary-alerts')
}

/* ─── Indicator ──────────────────────────────────────────────────────────── */

function currentOffTopicSeconds () {
  var extra = 0
  if (state.offTopicStartTime && state.windowFocused) {
    extra = Math.round((Date.now() - state.offTopicStartTime) / 1000)
  }
  return state.offTopicSeconds + extra
}

function updateIndicator () {
  if (!ui.indicator) return
  if (!state.enabled) {
    ui.indicator.hidden = true
    return
  }
  ui.indicator.hidden = false
  var mins = Math.floor(currentOffTopicSeconds() / 60)
  if (mins > 0) {
    ui.indicator.textContent = mins + ' min off-track'
    ui.indicator.classList.add('is-off-track')
  } else {
    ui.indicator.textContent = 'On track'
    ui.indicator.classList.remove('is-off-track')
  }
}

/* ─── Time formatter ─────────────────────────────────────────────────────── */

function formatTime (seconds) {
  var m = Math.floor(seconds / 60)
  var s = seconds % 60
  if (m > 0) return m + 'm ' + s + 's'
  return s + 's'
}

/* ─── Modal helpers ──────────────────────────────────────────────────────── */

function getModalMode () {
  return require('modalMode.js')
}

function showGoalModal () {
  if (!ui.goalModal) return
  webviews.requestPlaceholder('focusMode')
  ui.goalModal.hidden = false
  // pre-fill with current goal so the user can see/update it
  ui.goalInput.value = state.goal || localStorage.getItem('focusModeGoal') || ''
  ui.goalInput.focus()
  ui.goalInput.select()
}

function hideGoalModal () {
  if (!ui.goalModal) return
  ui.goalModal.hidden = true
  webviews.hidePlaceholder('focusMode')
}

function showSummaryModal (totalSec, onSec, offSec, alerts) {
  if (!ui.summaryModal) return
  ui.summaryTotal.textContent = formatTime(totalSec)
  ui.summaryOnTopic.textContent = formatTime(onSec)
  ui.summaryOffTopic.textContent = formatTime(offSec)
  ui.summaryAlerts.textContent = alerts

  webviews.requestPlaceholder('focusMode')
  ui.summaryModal.hidden = false
  getModalMode().toggle(true, {
    onDismiss: function () {
      ui.summaryModal.hidden = true
      webviews.hidePlaceholder('focusMode')
      getModalMode().toggle(false)
    }
  })
}

/* ─── Alert bar ──────────────────────────────────────────────────────────── */

var alertAutoHideTimer = null

function showAlert () {
  if (!ui.alertBar) return
  if (ui.alertGoal) ui.alertGoal.textContent = state.goal
  ui.alertBar.hidden = false

  if (alertAutoHideTimer) clearTimeout(alertAutoHideTimer)
  alertAutoHideTimer = setTimeout(function () {
    if (ui.alertBar) ui.alertBar.hidden = true
  }, 10000)
}

/* ─── Relevance check ────────────────────────────────────────────────────── */

function checkRelevance (url, title, meta) {
  if (!state.enabled || state.goalTokens.length === 0) return

  var signals = [url || '', title || '', meta || '']
  var score = scoreRelevance(signals, state.goalTokens)
  var isOnTopic = score >= 1

  if (isOnTopic) {
    if (state.offTopicStartTime) {
      state.offTopicSeconds += Math.round((Date.now() - state.offTopicStartTime) / 1000)
      state.offTopicStartTime = null
    }
    state.consecutiveOffTopic = 0
    state.currentPageOnTopic = true
  } else {
    if (!state.offTopicStartTime && state.windowFocused) {
      state.offTopicStartTime = Date.now()
    }
    state.consecutiveOffTopic++
    state.currentPageOnTopic = false

    if (state.consecutiveOffTopic >= 2) {
      var now = Date.now()
      if (now - state.lastAlertTime > 3 * 60 * 1000) {
        showAlert()
        state.lastAlertTime = now
        state.driftAlerts++
      }
      state.consecutiveOffTopic = 0
    }
  }

  updateIndicator()
}

/* ─── Page content sampler (every 45 s) ─────────────────────────────────── */

function sampleCurrentPage () {
  if (!state.enabled) return
  var tabId = tabs.getSelected()
  if (!tabId) return
  var tab = tabs.get(tabId)
  if (!tab || !tab.url) return
  if (tab.url.indexOf('min://') === 0 || tab.url.indexOf('about:') === 0) return

  var code = [
    '(function(){',
    '  var m = document.querySelector(\'meta[name="description"]\');',
    '  return {',
    '    title: document.title || "",',
    '    meta: m ? (m.getAttribute("content") || "") : "",',
    '    url: window.location.href || ""',
    '  };',
    '})()'
  ].join('\n')

  webviews.callAsync(tabId, 'executeJavaScript', [code], function (err, result) {
    if (!err && result) {
      checkRelevance(result.url, result.title, result.meta)
    }
  })
}

/* ─── Session lifecycle ──────────────────────────────────────────────────── */

function startSession (goal) {
  state.goal = goal
  state.goalTokens = tokenize(goal)
  state.sessionStart = Date.now()
  state.consecutiveOffTopic = 0
  state.lastAlertTime = 0
  state.offTopicSeconds = 0
  state.offTopicStartTime = null
  state.currentPageOnTopic = true
  state.driftAlerts = 0

  localStorage.setItem('focusModeGoal', goal)

  if (state.samplingInterval) clearInterval(state.samplingInterval)
  state.samplingInterval = setInterval(sampleCurrentPage, 45000)

  if (state.timerInterval) clearInterval(state.timerInterval)
  state.timerInterval = setInterval(updateIndicator, 5000)

  sampleCurrentPage()
  updateIndicator()
}

function endSession () {
  if (state.samplingInterval) { clearInterval(state.samplingInterval); state.samplingInterval = null }
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null }

  if (state.offTopicStartTime) {
    state.offTopicSeconds += Math.round((Date.now() - state.offTopicStartTime) / 1000)
    state.offTopicStartTime = null
  }

  var totalSec = state.sessionStart ? Math.round((Date.now() - state.sessionStart) / 1000) : 0
  var offSec = state.offTopicSeconds
  var onSec = Math.max(0, totalSec - offSec)

  showSummaryModal(totalSec, onSec, offSec, state.driftAlerts)

  state.enabled = false
  state.sessionStart = null
  state.goal = ''
  state.goalTokens = []
  localStorage.removeItem('focusModeGoal')
  updateIndicator()
}

/* ─── Enable / disable ───────────────────────────────────────────────────── */

function enable () {
  state.enabled = true
  updateIndicator()
}

function disable () {
  if (state.sessionStart) {
    endSession()
  } else {
    state.enabled = false
    updateIndicator()
  }
}

/* ─── Window blur / focus ────────────────────────────────────────────────── */

function onWindowBlur () {
  state.windowFocused = false
  if (state.offTopicStartTime) {
    state.offTopicSeconds += Math.round((Date.now() - state.offTopicStartTime) / 1000)
    state.offTopicStartTime = null
  }
}

function onWindowFocus () {
  state.windowFocused = true
  if (state.enabled && !state.currentPageOnTopic && !state.offTopicStartTime) {
    state.offTopicStartTime = Date.now()
  }
}

/* ─── Initialize ─────────────────────────────────────────────────────────── */

function initialize () {
  getUIElements()

  ipc.on('blur', onWindowBlur)
  ipc.on('focus', onWindowFocus)

  // Show goal modal on every new blank tab while Focus Mode is ON
  tasks.on('tab-added', function (tabId, tab) {
    if (!state.enabled) return
    if (!state.sessionRestoreComplete) return // don't show during startup restore
    if (tab && tab.url) return // skip tabs opened with a URL (link/bookmark)
    // small delay so the tab UI settles before the modal appears
    setTimeout(function () {
      if (state.enabled) showGoalModal()
    }, 150)
  })

  // Intercept tab URL changes on the active tab
  tasks.on('tab-updated', function (id, key) {
    if (!state.enabled) return
    if (key === 'url' && id === tabs.getSelected()) {
      var tab = tabs.get(id)
      if (!tab || !tab.url) return
      var url = tab.url
      if (url.indexOf('min://') === 0 || url.indexOf('about:') === 0) return
      checkRelevance(url, tab.title || '', '')
    }
  })

  // Goal modal — submit button
  document.getElementById('focus-goal-submit').addEventListener('click', function () {
    var goal = ui.goalInput.value.trim()
    if (!goal) return
    hideGoalModal()
    startSession(goal)
  })

  // Goal modal — Enter key
  ui.goalInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var goal = this.value.trim()
      if (!goal) return
      hideGoalModal()
      startSession(goal)
    } else if (e.key === 'Escape') {
      hideGoalModal()
    }
  })

  // Goal modal — Dismiss (×)
  document.getElementById('focus-goal-dismiss').addEventListener('click', function () {
    hideGoalModal()
  })

  // Goal modal — Open Preferences
  document.getElementById('focus-goal-open-prefs').addEventListener('click', function () {
    hideGoalModal()
    webviews.update(tabs.getSelected(), 'min://app/pages/settings/index.html')
  })

  // Alert bar — Ignore
  document.getElementById('focus-alert-ignore').addEventListener('click', function () {
    if (ui.alertBar) ui.alertBar.hidden = true
  })

  // Alert bar — Refocus (open a new blank tab)
  document.getElementById('focus-alert-refocus').addEventListener('click', function () {
    if (ui.alertBar) ui.alertBar.hidden = true
    require('browserUI.js').addTab()
  })

  // Summary close button
  document.getElementById('focus-summary-close').addEventListener('click', function () {
    if (ui.summaryModal) ui.summaryModal.hidden = true
    webviews.hidePlaceholder('focusMode')
    getModalMode().toggle(false)
  })

  // React to settings toggle (from settings page)
  var _initialLoad = true
  settings.listen('focusModeEnabled', function (value) {
    if (_initialLoad) {
      _initialLoad = false
      if (value === true) enable()
      return
    }
    if (value === true && !state.enabled) {
      enable()
    } else if (!value && state.enabled) {
      disable()
    }
  })

  updateIndicator()
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

module.exports = {
  initialize: initialize,
  enabled: function () { return state.enabled },
  warn: function () { ipc.invoke('showFocusModeDialog2') },
  enable: enable,
  disable: disable,
  startSession: startSession,
  endSession: endSession,
  tokenize: tokenize,
  scoreRelevance: scoreRelevance,
  checkRelevance: checkRelevance,
  onSessionRestoreComplete: function () { state.sessionRestoreComplete = true }
}
