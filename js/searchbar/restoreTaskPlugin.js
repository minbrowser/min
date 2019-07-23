var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var searchbarUtils = require('searchbar/searchbarUtils.js')

var browserUI = require('browserUI.js')

searchbarPlugins.register('restoreTask', {
  index: 0,
  trigger: function (text) {
    return !text && performance.now() < 5000 && tasks.getSelected().tabs.isEmpty() && window.createdNewTaskOnStartup
  },
  showResults: function (text, input, event, container) {
    empty(container)

    var lastTask = tasks.slice().sort((a, b) => {
      return tasks.getLastActivity(b.id) - tasks.getLastActivity(a.id)})[1]
    var recentTabs = lastTask.tabs.get().sort((a, b) => b.lastActivity - a.lastActivity).slice(0, 3)

    if (recentTabs.length === 1) {
      var title = searchbarUtils.getRealTitle(recentTabs[0].title)
    } else if (recentTabs.length === 2) {
      var title = l('taskDescriptionTwo').replace('%t', searchbarUtils.getRealTitle(recentTabs[0].title)).replace('%t', searchbarUtils.getRealTitle(recentTabs[1].title))
    } else {
      var title = l('taskDescriptionThree').replace('%t', searchbarUtils.getRealTitle(recentTabs[0].title)).replace('%t', searchbarUtils.getRealTitle(recentTabs[1].title)).replace('%n', (lastTask.tabs.count() - 2))
    }

    var item = searchbarUtils.createItem({
      title: title,
      descriptionBlock: l('returnToTask')
    })
    item.addEventListener('click', function (e) {
      var thisTask = tasks.getSelected().id
      browserUI.switchToTask(lastTask.id)
      browserUI.closeTask(thisTask)
    })
    container.appendChild(item)
  }
})