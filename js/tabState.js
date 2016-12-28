var tabState = {
  tasks: [], // each task is {id, name, tabs: []}
  selectedTask: null
}

var tabPrototype = {
  add: function (tab, index) {
    // make sure the tab exists before we create it
    if (!tab) {
      var tab = {}
    }

    var tabId = String(tab.id || Math.round(Math.random() * 100000000000000000)) // you can pass an id that will be used, or a random one will be generated.

    var newTab = {
      url: tab.url || '',
      title: tab.title || '',
      id: tabId,
      lastActivity: tab.lastActivity || Date.now(),
      secure: tab.secure,
      private: tab.private || false,
      readerable: tab.readerable || false,
      backgroundColor: tab.backgroundColor,
      foregroundColor: tab.foregroundColor,
      selected: tab.selected || false
    }

    if (index) {
      this.splice(index, 0, newTab)
    } else {
      this.push(newTab)
    }

    return tabId
  },
  update: function (id, data) {
    if (!this.get(id)) {
      throw new ReferenceError('Attempted to update a tab that does not exist.')
    }
    var index = -1
    for (var i = 0; i < this.length; i++) {
      if (this[i].id === id) {
        index = i
      }
    }
    for (var key in data) {
      if (data[key] === undefined) {
        throw new ReferenceError('Key ' + key + ' is undefined.')
      }
      this[index][key] = data[key]
    }
  },
  destroy: function (id) {
    for (var i = 0; i < this.length; i++) {
      if (this[i].id === id) {
        this.splice(i, 1)
        return i
      }
    }
    return false
  },
  destroyAll: function () {
    // this = [] doesn't work, so set the length of the array to 0 to remove all of the itemss
    this.length = 0
  },
  get: function (id) {
    if (!id) { // no id provided, return an array of all tabs
      // it is important to deep-copy the tab objects when returning them. Otherwise, the original tab objects get modified when the returned tabs are modified (such as when processing a url).
      var tabsToReturn = []
      for (var i = 0; i < this.length; i++) {
        tabsToReturn.push(JSON.parse(JSON.stringify(this[i])))
      }
      return tabsToReturn
    }
    for (var i = 0; i < this.length; i++) {
      if (this[i].id === id) {
        return JSON.parse(JSON.stringify(this[i]))
      }
    }
    return undefined
  },
  getIndex: function (id) {
    for (var i = 0; i < this.length; i++) {
      if (this[i].id === id) {
        return i
      }
    }
    return -1
  },
  getSelected: function () {
    for (var i = 0; i < this.length; i++) {
      if (this[i].selected) {
        return this[i].id
      }
    }
    return null
  },
  getAtIndex: function (index) {
    return this[index] || undefined
  },
  setSelected: function (id) {
    if (!this.get(id)) {
      throw new ReferenceError('Attempted to select a tab that does not exist.')
    }
    for (var i = 0; i < this.length; i++) {
      if (this[i].id === id) {
        this[i].selected = true
      } else {
        this[i].selected = false
      }
    }
  },
  count: function () {
    return this.length
  },
  reorder: function (newOrder) { // newOrder is an array of [tabId, tabId] that indicates the order that tabs should be in
    this.sort(function (a, b) {
      return newOrder.indexOf(a.id) - newOrder.indexOf(b.id)
    })
  }
}

function getRandomId () {
  return Math.round(Math.random() * 100000000000000000)
}

var tasks = {
  add: function (task, index) {
    if (!task) {
      task = {}
    }

    var newTask = {
      name: task.name || null,
      tabs: task.tabs || [],
      id: task.id || String(getRandomId())
    }

    // task.currentTask.tabs.__proto__ = tabPrototype

    for (var key in tabPrototype) {
      newTask.tabs.__proto__[key] = tabPrototype[key]
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

function getSelectedTask () {
  return getTask(tabState.selectedTask)
}

function isEmpty (tabList) {
  if (!tabList || tabList.length === 0) {
    return true
  }

  if (tabList.length === 1 && (!tabList[0].url || tabList[0].url === 'about:blank')) {
    return true
  }

  return false
}
