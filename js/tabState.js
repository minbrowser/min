const TaskList  = require("tabState/task.js")

function initializeTabState () {
  window.tasks = new TaskList()
  window.currentTask = undefined
  window.tabs = undefined
}

initializeTabState()
