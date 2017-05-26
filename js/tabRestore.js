function TabStack() {
  this.depth = 20
  this.stack = []
}

TabStack.prototype.push = function (tabId) {
  var closedTab = tabs.get(tabId)

  // Do not store private tabs or blank tabs
  if (closedTab.private
    || closedTab.url === 'about:blank'
    || closedTab.url === '') {
    return
  }

  if (this.stack.length >= this.depth) {
    this.stack.shift()
  }

  this.stack.push(closedTab)
}

TabStack.prototype.restore = function () {
  if (this.stack.length === 0) {
    return
  }

  lastTab = window.currentTask.tabs[window.tabs.length - 1]

  // Open the tab in the last slot
  if (lastTab === undefined)  {
    newIndex = 0
  } else {
    newIndex = tabs.getIndex(lastTab.id) + 1
  }

  if (isEmpty(tabs.get())) {
    destroyTab(tabs.getAtIndex(0).id)
  }

  var newTab = tabs.add(this.stack.pop(), newIndex)

  addTab(newTab, {
    focus: false,
    leaveEditMode: true,
    enterEditMode: false,
  })
}
