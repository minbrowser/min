var searchbarPlugins = require('searchbar/searchbarPlugins.js')
var bangsPlugin = require('searchbar/bangsPlugin.js')
var tabEditor = require('navbar/tabEditor.js')
var focusMode = require('focusMode.js')
var browserUI = require('browserUI.js')
var taskOverlay = require('taskOverlay/taskOverlay.js')


function moveToTask(text) {
    /* disabled in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      // remove the tab from the current task

      var currentTab = tabs.get(tabs.getSelected())
      tabs.destroy(currentTab.id)

      // make sure the task has at least one tab in it
      if (tabs.count() === 0) {
        tabs.add()
      }

      var newTask = getTaskByNameOrNumber(text.toLowerCase())

      if (newTask) {
        newTask.tabs.add(currentTab, { atEnd: true })
      } else {
      // create a new task with the given name
        newTask = tasks.get(tasks.add(undefined, tasks.getIndex(tasks.getSelected().id) + 1))
        newTask.name = text

        newTask.tabs.add(currentTab)
      }

      browserUI.switchToTask(newTask.id)
      browserUI.switchToTab(currentTab.id)

      // disabled this for faster animations
      // taskOverlay.show()

      // setTimeout(function () {
      //   taskOverlay.hide()
      // }, 600)
}

function switchToTask (text) {
  /* disabled in focus mode */
    if (focusMode.enabled()) {
      focusMode.warn()
      return
    }

    text = text.toLowerCase()

    // no task was specified, show all of the tasks
    if (!text) {
      taskOverlay.show()
      return
    }

    var task = getTaskByNameOrNumber(text)

    if (task) {
      browserUI.switchToTask(task.id)
    }
  }

// returns a task with the same name or index ("1" returns the first task, etc.)
function getTaskByNameOrNumber (text) {
  const textAsNumber = parseInt(text)

  return tasks.find((task, index) => (task.name && task.name.toLowerCase() === text) || index + 1 === textAsNumber
  )
}

module.exports = {
  initialize: function () {
    bangsPlugin.registerCustomBang({
      phrase: '!movetotask',
      snippet: l('moveToTask'),
      isAction: false,
      showSuggestions: function (text, input, event) {
        searchbarPlugins.reset('bangs')

        var isFirst = true
        
        tasks.forEach(function (task) {
          var taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1))
          searchbarPlugins.addResult('bangs', {
            title: taskName,
            fakeFocus: isFirst && text,
            click: function () {
              tabEditor.hide()
              moveToTask('%n'.replace('%n', tasks.getIndex(task.id) + 1))
            }
          })
          isFirst = false
        })
      },
      
      fn: moveToTask
      
  })

  bangsPlugin.registerCustomBang({
    phrase: '!task',
    snippet: l('switchToTask'),
    isAction: false,
    showSuggestions: function (text, input, event) {
      searchbarPlugins.reset('bangs')

      var isFirst = true
      
      tasks.forEach(function (task) {
        var taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1))
        searchbarPlugins.addResult('bangs', {
          title: taskName,
          fakeFocus: isFirst && text,
          click: function () {
            tabEditor.hide()
            switchToTask('%n'.replace('%n', tasks.getIndex(task.id) + 1))
          }
        })
        isFirst = false
      })
    },
    
    fn: switchToTask
    
})

  }

}
