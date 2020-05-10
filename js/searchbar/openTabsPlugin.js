var browserUI = require('browserUI.js')
var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var urlParser = require('util/urlParser.js')

var stringScore = require('string_score')

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
      var fuzzyTitleScore = tab.title.substring(0, 50).score(text, 0.5)
      var fuzzyUrlScore = tabUrl.score(text, 0.5)

      if (exactMatch || fuzzyTitleScore > 0.4 || fuzzyUrlScore > 0.4) {
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

  var finalMatches = matches.sort(function (a, b) {
    if (a.task.id === currentTask.id) {
      a.score += 0.2
    }
    if (b.task.id === currentTask.id) {
      b.score += 0.2
    }
    return b.score - a.score
  }).slice(0, 2)

  finalMatches.forEach(function (match) {
    var data = {
      icon: 'fa-external-link-square',
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
    index: 4,
    trigger: function (text) {
      return text.length > 2
    },
    showResults: searchOpenTabs
  })
}

module.exports = {initialize}
