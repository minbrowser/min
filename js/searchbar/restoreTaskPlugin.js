var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')

var browserUI = require('browserUI.js')

function getFormattedTitle (tab) {
  if (tab.title) {
    var title = searchbarUtils.getRealTitle(tab.title)
    return '"' + (title.length > 45 ? title.substring(0, 45).trim() + '...' : title) + '"'
  } else {
    return l('newTabLabel')
  }
}

function showRestoreTask () {
  searchbarPlugins.reset('restoreTask')

  var lastTask = tasks.slice().sort((a, b) => {
    return tasks.getLastActivity(b.id) - tasks.getLastActivity(a.id)
  })[1]
  var recentTabs = lastTask.tabs.get().sort((a, b) => b.lastActivity - a.lastActivity).slice(0, 3)

  var taskDescription
  if (recentTabs.length === 1) {
    taskDescription = getFormattedTitle(recentTabs[0])
  } else if (recentTabs.length === 2) {
    taskDescription = l('taskDescriptionTwo').replace('%t', getFormattedTitle(recentTabs[0])).replace('%t', getFormattedTitle(recentTabs[1]))
  } else {
    taskDescription = l('taskDescriptionThree').replace('%t', getFormattedTitle(recentTabs[0])).replace('%t', getFormattedTitle(recentTabs[1])).replace('%n', (lastTask.tabs.count() - 2))
  }

  searchbarPlugins.addResult('restoreTask', {
    title: l('returnToTask'),
    descriptionBlock: taskDescription,
    icon: 'carbon:redo',
    click: function (e) {
      var thisTask = tasks.getSelected().id
      browserUI.switchToTask(lastTask.id)
      browserUI.closeTask(thisTask)
    }
  })
}

function initialize () {
  searchbarPlugins.register('restoreTask', {
    index: 0,
    trigger: function (text) {
      return !text && performance.now() < 15000 && tasks.getSelected().tabs.isEmpty() && window.createdNewTaskOnStartup
    },
    showResults: showRestoreTask
  })
}

module.exports = { initialize }
