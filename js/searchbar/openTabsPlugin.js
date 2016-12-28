var stringScore = require('string_score')

var searchOpenTabs = function (text, input, event, container) {
  empty(container)

  var matches = []
  var searchText = text.toLowerCase()
  var currentTab = currentTask.tabs.getSelected()

  tasks.get().forEach(function (task) {
    task.tabs.get().forEach(function (tab) {
      if (tab.id === currentTab || !tab.title || tab.url === 'about:blank') {
        return
      }

      var tabUrl = urlParser.removeProtocol(tab.url) // don't search protocols

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
      secondaryText: urlParser.removeProtocol(match.tab.url).replace(trailingSlashRegex, '')
    }

    if (match.task.id !== currentTask.id) {
      var taskName = match.task.name || 'Task ' + (tasks.getIndex(match.task.id) + 1)
      data.metadata = [taskName]
    }

    var item = createSearchbarItem(data)

    item.addEventListener('click', function () {
      // if we created a new tab but are switching away from it, destroy the current (empty) tab
      var currentTabUrl = tabs.get(tabs.getSelected()).url
      if (!currentTabUrl || currentTabUrl === 'about:blank') {
        closeTab(tabs.getSelected())
      }

      if (match.task.id !== currentTask.id) {
        switchToTask(match.task.id)
      }

      switchToTab(match.tab.id)
    })

    container.appendChild(item)
  })

  searchbarResultCount += finalMatches.length
}

registerSearchbarPlugin('openTabs', {
  index: 4,
  trigger: function (text) {
    return text.length > 2
  },
  showResults: searchOpenTabs
})
