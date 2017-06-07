function TabStack(tabStack) {
  this.depth = 20

  if (tabStack) {
    this.stack = tabStack.stack
  } else {
    this.stack = []
  }
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

TabStack.prototype.pop = function () {
  return this.stack.pop()
}
