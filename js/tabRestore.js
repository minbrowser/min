function TabStack (tabStack) {
  this.depth = 10

  if (tabStack) {
    this.stack = tabStack.stack
  } else {
    this.stack = []
  }
}

TabStack.prototype.push = function (closedTab) {
  // Do not store private tabs or blank tabs
  if (closedTab.private ||
    closedTab.url === '') {
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

module.exports = TabStack
