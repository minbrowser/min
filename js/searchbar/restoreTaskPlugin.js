const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const searchbarUtils = require('searchbar/searchbarUtils.js')

const browserUI = require('browserUI.js')

function showRestoreTask () {
  searchbarPlugins.reset('restoreTask')

  const lastTask = tasks.slice().sort((a, b) => {
    return tasks.getLastActivity(b.id) - tasks.getLastActivity(a.id)
  })[1]
  const recentTabs = lastTask.tabs.get().sort((a, b) => b.lastActivity - a.lastActivity).slice(0, 3)

  if (recentTabs.length === 1) {
    var title = searchbarUtils.getRealTitle(recentTabs[0].title) || l('newTabLabel')
  } else if (recentTabs.length === 2) {
    var title = l('taskDescriptionTwo').replace('%t', searchbarUtils.getRealTitle(recentTabs[0].title) || l('newTabLabel')).replace('%t', searchbarUtils.getRealTitle(recentTabs[1].title) || l('newTabLabel'))
  } else {
    var title = l('taskDescriptionThree').replace('%t', searchbarUtils.getRealTitle(recentTabs[0].title) || l('newTabLabel')).replace('%t', searchbarUtils.getRealTitle(recentTabs[1].title) || l('newTabLabel')).replace('%n', (lastTask.tabs.count() - 2))
  }

  searchbarPlugins.addResult('restoreTask', {
    title: title,
    descriptionBlock: l('returnToTask'),
    click: function (e) {
      const thisTask = tasks.getSelected().id
      browserUI.switchToTask(lastTask.id)
      browserUI.closeTask(thisTask)
    }
  })
}

function initialize () {
  searchbarPlugins.register('restoreTask', {
    index: 0,
    trigger: function (text) {
      return !text && performance.now() < 5000 && tasks.getSelected().tabs.isEmpty() && window.createdNewTaskOnStartup
    },
    showResults: showRestoreTask
  })
}

module.exports = { initialize }
