const tabPrototype = require("tabState/tab.js")
const TabStack = require("tabRestore.js")

const taskPrototype = {
  add: function (task, index) {
    if (!task) {
      task = {}
    }

    var newTask = {
      name: task.name || null,
      tabs: task.tabs || [],
      tabHistory: new TabStack(task.tabHistory),
      id: task.id || String(getRandomId())
    }

    for (var key in tabPrototype) {
      newTask.tabs[key] = tabPrototype[key]
    }

    if (index) {
      tabState.tasks.splice(index, 0, newTask)
    } else {
      tabState.tasks.push(newTask)
    }

    return newTask.id
  },
  get: function (id) {
    if (!id) {
      return tabState.tasks
    }

    for (var i = 0; i < tabState.tasks.length; i++) {
      if (tabState.tasks[i].id === id) {
        return tabState.tasks[i]
      }
    }
    return null
  },
  getTaskContainingTab: function (tabId) {
    for (var i = 0; i < tabState.tasks.length; i++) {
      if (tabState.tasks[i].tabs.has(tabId)) {
        return tabState.tasks[i]
      }
    }
    return null
  },
  getIndex: function (id) {
    for (var i = 0; i < tabState.tasks.length; i++) {
      if (tabState.tasks[i].id === id) {
        return i
      }
    }
    return -1
  },
  setSelected: function (id) {
    tabState.selectedTask = id
    window.currentTask = tasks.get(id)
    window.tabs = currentTask.tabs
  },
  destroy: function (id) {
    for (var i = 0; i < tabState.tasks.length; i++) {
      if (tabState.tasks[i].id === id) {
        tabState.tasks.splice(i, 1)
        return i
      }
    }
    return false
  },
  destroyAll: function () {
    tabState.tasks = []
    currentTask = null
  },
  update: function (id, data) {
    if (!tasks.get(id)) {
      throw new ReferenceError('Attempted to update a task that does not exist.')
    }

    for (var i = 0; i < tabState.tasks.length; i++) {
      if (tabState.tasks[i].id === id) {
        for (var key in data) {
          tabState.tasks[i][key] = data[key]
        }
        break
      }
    }
  },
  getLastActivity: function (id) {
    var tabs = tasks.get(id).tabs
    var lastActivity = 0

    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].lastActivity > lastActivity) {
        lastActivity = tabs[i].lastActivity
      }
    }

    return lastActivity
  }
}

function getRandomId () {
  return Math.round(Math.random() * 100000000000000000)
}

module.exports = taskPrototype
