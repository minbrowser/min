const MAX_TAB_HISTORY_DEPTH = 20
var tabHistoryStack = Array()

var tabHistory = {
  push: function (tabId) {
    var tab = tabs.get(tabId)
    // Do not store private tabs or blank tabs
    if (tab.private || tab.url === 'about:blank') {
      return
    }

    if (tabHistoryStack.length < MAX_TAB_HISTORY_DEPTH) {
      tabHistoryStack.push(tab)
    } else {
      tabHistoryStack.shift()
      tabHistoryStack.push(tab)
    }
  },
  restore: function () {
    if (tabHistoryStack.length === 0) {
      return
    }

    var newIndex = tabs.getIndex(tabs.getSelected()) + 1
    var newTab = tabs.add(tabHistoryStack.pop(), newIndex)

    addTab(newTab, {
      focus: false,
      leaveEditMode: true,
      enterEditMode: false,
    })
  }
}
