const TaskList = require('tabState/task.js')

function initialize () {
  window.tasks = new TaskList()
  window.tabs = undefined
}

module.exports = { initialize }
