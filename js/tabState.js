const TaskList  = require("tabState/task.js")

function initializeTabState () {
  window.tasks = new TaskList()
  window.tabs = undefined
}

initializeTabState()
