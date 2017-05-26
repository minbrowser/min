function TabHistory() {
  this.depth = 20
  this.stack = Array()

  if (arguments.callee._singletonInstance) {
    return arguments.callee._singletonInstance
  }

  arguments.callee._singletonInstance = this;
}

TabHistory.prototype.push = function (tabId) {
  var tab = tabs.get(tabId)
  // Do not store private tabs or blank tabs
  if (tab.private || tab.url === 'about:blank' || tab.url === '') {
    return
  }

  if (this.stack.length < this.depth) {
    this.stack.push(tab)
  } else {
    this.stack.shift()
    this.stack.push(tab)
  }
}

TabHistory.prototype.restore = function () {
  if (this.stack.length === 0) {
    return
  }

  var newIndex = tabs.getIndex(tabs.getSelected()) + 1
  var newTab = tabs.add(this.stack.pop(), newIndex)

  addTab(newTab, {
    focus: false,
    leaveEditMode: true,
    enterEditMode: false,
  })
}

var tabHistory = new TabHistory()
