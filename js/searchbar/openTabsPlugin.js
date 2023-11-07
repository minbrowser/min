var browserUI = require('browserUI.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var urlParser = require('util/urlParser.js')

const quickScore = require('quick-score').quickScore

var searchOpenTabs = function (text, input, event) {
  searchbarPlugins.reset('openTabs')

  var matches = []
  var searchText = text.toLowerCase()
  var currentTask = tasks.getSelected()
  var currentTab = currentTask.tabs.getSelected()

  tasks.forEach(function (task) {
    task.tabs.forEach(function (tab) {
      if (tab.id === currentTab || !tab.title || !tab.url) {
        return
      }

      var tabUrl = urlParser.basicURL(tab.url) // don't search protocols

      var exactMatch = tab.title.toLowerCase().indexOf(searchText) !== -1 || tabUrl.toLowerCase().indexOf(searchText) !== -1
      var fuzzyTitleScore = quickScore(tab.title.substring(0, 50), text)
      var fuzzyUrlScore = quickScore(tabUrl, text)

      if (exactMatch || fuzzyTitleScore > 0.35 || fuzzyUrlScore > 0.35) {
        matches.push({
          task: task,
          tab: tab,
          score: fuzzyTitleScore + fuzzyUrlScore
        })
      }
    })
  })

  if (matches.length === 0) {
    return
  }

  function scoreMatch (match) {
    let score = 0
    if (match.task.id === currentTask.id) {
      score += 0.2
    }
    const age = Date.now() - (match.tab.lastActivity || 0)

    score += 0.3 / (1 + Math.exp(age / (30 * 24 * 60 * 60 * 1000)))
    return score
  }

  var finalMatches = matches.map(function (match) {
    match.score += scoreMatch(match)
    return match
  }).sort(function (a, b) {
    return b.score - a.score
  }).slice(0, 2)

  finalMatches.forEach(function (match) {
    var data = {
      icon: 'carbon:arrow-up-right',
      title: match.tab.title,
      secondaryText: urlParser.basicURL(match.tab.url)
    }

    if (match.task.id !== currentTask.id) {
      var taskName = match.task.name || l('taskN').replace('%n', (tasks.getIndex(match.task.id) + 1))
      data.metadata = [taskName]
    }

    data.click = function () {
      // if we created a new tab but are switching away from it, destroy the current (empty) tab
      var currentTabUrl = tabs.get(tabs.getSelected()).url
      if (!currentTabUrl) {
        browserUI.closeTab(tabs.getSelected())
      }

      if (match.task.id !== currentTask.id) {
        browserUI.switchToTask(match.task.id)
      }

      browserUI.switchToTab(match.tab.id)
    }

    searchbarPlugins.addResult('openTabs', data)
  })
}

function initialize () {
  searchbarPlugins.register('openTabs', {
    index: 3,
    trigger: function (text) {
      return text.length > 2
    },
    showResults: searchOpenTabs
  })
}

module.exports = { initialize }
