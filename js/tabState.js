const TaskList = require('tabState/task.js')

function initialize () {
  try {
    window.tasks = new TaskList()
    window.tabs = undefined

    // Ensure at least one task exists
    if (!window.tasks || window.tasks.getLength() === 0) {
      const defaultTaskId = window.tasks.add({})
      window.tasks.setSelected(defaultTaskId)
    }

    // Validate task state
    if (!window.tasks.getSelected()) {
      const firstTask = window.tasks.byIndex(0)
      if (firstTask) {
        window.tasks.setSelected(firstTask.id)
      }
    }

    // Ensure selected task has at least one tab
    const selectedTask = window.tasks.getSelected()
    if (selectedTask && selectedTask.tabs.count() === 0) {
      selectedTask.tabs.add({})
    }

    return true
  } catch (err) {
    console.error('Failed to initialize tab state:', err)
    // Create emergency fallback state
    window.tasks = new TaskList()
    const emergencyTaskId = window.tasks.add({})
    window.tasks.setSelected(emergencyTaskId)
    window.tasks.get(emergencyTaskId).tabs.add({})
    return false
  }
}

module.exports = { initialize }
