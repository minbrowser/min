const TabList = require('tabState/tab.js')
const TabStack = require('tabRestore.js')

class TaskList {
  constructor () {
    this.selected = null
    this.tasks = [] // each task is {id, name, tabs: [], tabHistory: TabStack}
    this.events = []
    this.pendingCallbacks = []
    this.pendingCallbackTimeout = null
  }

  on (name, fn) {
    this.events.push({name, fn})
  }

  emit (name, ...data) {
    this.events.forEach(listener => {
      if (listener.name === name) {
        this.pendingCallbacks.push([listener.fn, data])

        // run multiple events in one timeout, since calls to setTimeout() appear to be slow (at least based on timeline data)
        if (!this.pendingCallbackTimeout) {
          this.pendingCallbackTimeout = setTimeout(() => {
            this.pendingCallbacks.forEach(t => t[0].apply(this, t[1]))
            this.pendingCallbacks = []
            this.pendingCallbackTimeout = null
          }, 0)
        }
      }
    })
  }

  add (task = {} , index) {
    const newTask = {
      name: task.name || null,
      tabs: new TabList(task.tabs, this),
      tabHistory: new TabStack(task.tabHistory),
      collapsed: task.collapsed, // this property must stay undefined if it is already (since there is a difference between "explicitly uncollapsed" and "never collapsed")
      id: task.id || String(TaskList.getRandomId())
    }

    if (index) {
      this.tasks.splice(index, 0, newTask)
    } else {
      this.tasks.push(newTask)
    }

    this.emit('task-added', newTask.id)

    return newTask.id
  }

  getStringifyableState () {
    return {
      tasks: this.tasks.map(task => Object.assign({}, task, {tabs: task.tabs.getStringifyableState()})),
      selectedTask: this.selected
    }
  }

  get (id) {
    return this.find(task => task.id == id) || null
  }

  getSelected () {
    return this.get(this.selected)
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
    window.tabs = this.get(id).tabs
    this.emit('task-selected', id)
    this.emit('tab-selected', tabs.getSelected())
  }

  destroy (id) {
    const index = this.getIndex(id)

    // emit the tab-destroyed event for all tabs in this task
    this.get(id).tabs.forEach(tab => this.emit('tab-destroyed', tab.id))

    this.emit('task-destroyed', id)

    if (index < 0) return false

    this.tasks.splice(index, 1)

    if (this.selected === id) {
      this.selected = null
    }

    return index
  }

  destroyAll () {
    this.tasks = []
    this.selected = null
  }

  getLastActivity (id) {
    var tabs = this.get(id).tabs
    var lastActivity = 0

    for (var i = 0; i < tabs.count(); i++) {
      if (tabs.getAtIndex(i).lastActivity > lastActivity) {
        lastActivity = tabs.getAtIndex(i).lastActivity
      }
    }

    return lastActivity
  }

  isCollapsed (id) {
    var task = this.get(id)
    return task.collapsed || (task.collapsed === undefined && Date.now() - tasks.getLastActivity(task.id) > (7 * 24 * 60 * 60 * 1000))
  }

  getLength () {
    return this.tasks.length
  }

  map (fun) { return this.tasks.map(fun) }

  forEach (fun) { return this.tasks.forEach(fun) }

  indexOf (task) { return this.tasks.indexOf(task) }

  slice (...args) { return this.tasks.slice.apply(this.tasks, args) }

  splice (...args) { return this.tasks.splice.apply(this.tasks, args) }

  filter (...args) { return this.tasks.filter.apply(this.tasks, args) }

  find (filter) {
    for (var i = 0, len = this.tasks.length; i < len; i++) {
      if (filter(this.tasks[i], i, this.tasks)) {
        return this.tasks[i]
      }
    }
  }

  static getRandomId () {
    return Math.round(Math.random() * 100000000000000000)
  }
}

module.exports = TaskList
