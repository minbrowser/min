function TabHistory() {
  this.depth = 20
  this.stack = Array()

  if (arguments.callee._singletonInstance) {
    return arguments.callee._singletonInstance
  }

  arguments.callee._singletonInstance = this;
}

TabHistory.prototype.push = function (tabId) {
  var closedTab = tabs.get(tabId)
  var parentTask

  tasks.get().forEach(function (task) {
    task.tabs.forEach(function (tab) {
      if (tab.id === tabId) {
        parentTask = task
      }
    })
  })

  // Do not store private tabs or blank tabs
  if (closedTab.private
    || closedTab.url === 'about:blank'
    || closedTab.url === '') {
    return
  }

  if (this.stack.length < this.depth) {
    this.stack.push({
      tab: closedTab,
      task: parentTask || getSelectedTask(),
    })
  } else {
    this.stack.shift()
    this.stack.push({
      tab: closedTab,
      task: parentTask || getSelectedTask(),
    })
  }
}

TabHistory.prototype.restore = function () {
  if (this.stack.length === 0) {
    return
  }

  var stackTop = this.stack.pop()
  var parentTask = stackTop.task

  if (tasks.get(parentTask.id) === null) {
    // The task has since been destroyed. Create a new one.
    parentTask.tabs = []
    tasks.add(parentTask)
  }

  switchToTask(parentTask.id)
  lastTab = getSelectedTask().tabs[parentTask.tabs.length - 1]

  // Open the tab in the last slot
  if (lastTab === undefined)  {
    newIndex = 0
  } else {
    newIndex = tabs.getIndex(lastTab.id) + 1
  }

  if (isEmpty(tabs.get())) {
    destroyTab(tabs.getAtIndex(0).id)
  }

  var newTab = tabs.add(stackTop.tab, newIndex)

  addTab(newTab, {
    focus: false,
    leaveEditMode: true,
    enterEditMode: false,
  })
}

var tabHistory = new TabHistory()
