const browserUI = require('browserUI.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const urlParser = require('util/urlParser.js')

const stringScore = require('string_score')

const searchOpenTabs = function (text, input, event) {
  searchbarPlugins.reset('openTabs')

  const matches = []
  const searchText = text.toLowerCase()
  const currentTask = tasks.getSelected()
  const currentTab = currentTask.tabs.getSelected()

  tasks.forEach(function (task) {
    task.tabs.forEach(function (tab) {
      if (tab.id === currentTab || !tab.title || !tab.url) {
        return
      }

      const tabUrl = urlParser.basicURL(tab.url) // don't search protocols

      const exactMatch = tab.title.toLowerCase().indexOf(searchText) !== -1 || tabUrl.toLowerCase().indexOf(searchText) !== -1
      const fuzzyTitleScore = tab.title.substring(0, 50).score(text, 0.5)
      const fuzzyUrlScore = tabUrl.score(text, 0.5)

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

  const finalMatches = matches.sort(function (a, b) {
    if (a.task.id === currentTask.id) {
      a.score += 0.2
    }
    if (b.task.id === currentTask.id) {
      b.score += 0.2
    }
    return b.score - a.score
  }).slice(0, 2)

  finalMatches.forEach(function (match) {
    const data = {
      icon: 'carbon:arrow-up-right',
      title: match.tab.title,
      secondaryText: urlParser.basicURL(match.tab.url)
    }

    if (match.task.id !== currentTask.id) {
      const taskName = match.task.name || l('taskN').replace('%n', (tasks.getIndex(match.task.id) + 1))
      data.metadata = [taskName]
    }

    data.click = function () {
      // if we created a new tab but are switching away from it, destroy the current (empty) tab
      const currentTabUrl = tabs.get(tabs.getSelected()).url
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
