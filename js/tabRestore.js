function TabStack(tabStack) {
  if (tabStack) {
    this.depth = tabStack.depth
    this.stack = tabStack.stack
  } else {
    this.depth = 20
    this.stack = []
  }
}

TabStack.prototype.push = function (tabId) {
  var closedTab = tabs.get(tabId)

  // Do not store private tabs, blank tabs, or preferences
  if (closedTab.private
    || closedTab.url === 'about:blank'
    || closedTab.url === ''
    || closedTab.url.match(/^file:\/\/\/.*\/min\/pages\/settings\/index.html$/)) {
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
