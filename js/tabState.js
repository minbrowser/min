const tabPrototype = require("tabState/tab.js")

function getRandomId () {
  return Math.round(Math.random() * 100000000000000000)
}

var taskPrototype = require("tabState/task.js")

function initializeTabState () {
  window.tabState = {
    tasks: [], // each task is {id, name, tabs: [], tabHistory: TabStack}
    selectedTask: null
  }
  for (var key in taskPrototype) {
    tabState.tasks[key] = taskPrototype[key]
  }

  window.tasks = tabState.tasks
  window.currentTask = undefined
  window.tabs = undefined
}

initializeTabState()
