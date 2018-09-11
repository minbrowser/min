const tabPrototype = require('tabState/tab.js')
const TabStack = require('tabRestore.js')

class TaskList {
  constructor () {
    this.selected = null
    this.tasks = [] // each task is {id, name, tabs: [], tabHistory: TabStack}
  }

  add (task = {}, index) {
    const newTask = {
      name: task.name || null,
      tabs: task.tabs || [],
      tabHistory: new TabStack(task.tabHistory),
      id: task.id || String(TaskList.getRandomId())
    }

    for (var key in tabPrototype) {
      newTask.tabs[key] = tabPrototype[key]
    }

    if (index) {
      this.tasks.splice(index, 0, newTask)
    } else {
      this.tasks.push(newTask)
    }

    return newTask.id
  }

  getStringifyableState () {
    return {
      tasks: this.tasks,
      selectedTask: this.selected
    }
  }

  get (id) {
    return this.tasks.find(task => task.id == id) || null
  }

  byIndex (index) {
    return this.tasks[index]
  }

  getTaskContainingTab (tabId) {
    return this.find(task => task.tabs.has(tabId)) || null
  }

  getIndex (id) {
    return this.tasks.findIndex(task => task.id == id)
  }

  setSelected (id) {
    this.selected = id
    window.currentTask = this.get(id)
    window.tabs = currentTask.tabs
  }

  destroy (id) {
    const index = this.getIndex(id)

    if(index < 0) return false

    this.tasks.splice(index, 1)
    return index
  }

  destroyAll () {
    this.tasks = []
    this.selected = null
    currentTask = null
  }

  update (id, data) {
    if (!this.get(id)) {
      throw new ReferenceError('Attempted to update a task that does not exist.')
    }

    for (var i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].id === id) {
        for (var key in data) {
          this.tasks[i][key] = data[key]
        }
        break
      }
    }
  }

  getLastActivity (id) {
    var tabs = this.get(id).tabs
    var lastActivity = 0

    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].lastActivity > lastActivity) {
        lastActivity = tabs[i].lastActivity
      }
    }

    return lastActivity
  }

  getLength() {
    return this.tasks.length
  }

  map(fun) { return this.tasks.map(fun) }

  forEach(fun) { return this.tasks.forEach(fun) }

  indexOf(task) { return this.tasks.indexOf(task) }

  find(task) { return this.tasks.find(task) }

  static getRandomId () {
    return Math.round(Math.random() * 100000000000000000)
  }
}

module.exports = TaskList
