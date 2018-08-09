/* common actions that affect different parts of the UI (webviews, tabstrip, etc) */

var urlParser = require('util/urlParser.js')
var focusMode = require('focusMode.js')
var tabActivity = require('navbar/tabActivity.js')

/* loads a page in a webview */

window.navigate = function (tabId, newURL) {
  newURL = urlParser.parse(newURL)

  tabs.update(tabId, {
    url: newURL
  })

  webviews.update(tabId, newURL)

  tabBar.leaveEditMode({
    blur: true
  })
}

/* creates a new task */

function addTask () {
  tasks.setSelected(tasks.add())
  taskOverlay.hide()

  tabBar.rerenderAll()
  addTab()
}

/* creates a new tab */

function addTab (tabId, options) {
  /*
  options
    options.enterEditMode - whether to enter editing mode when the tab is created. Defaults to true.
    options.openInBackground - whether to open the tab without switching to it. Defaults to false.
  */
  options = options || {}

  tabId = tabId || tabs.add()

  tabBar.addTab(tabId)
  webviews.add(tabId)

  if (!options.openInBackground) {
    switchToTab(tabId, {
      focusWebview: options.enterEditMode === false
    })
    if (options.enterEditMode !== false) {
      tabBar.enterEditMode(tabId)
    }
  }
}

/* destroys a task object and the associated webviews */

function destroyTask (id) {
  var task = tasks.get(id)

  task.tabs.forEach(function (tab) {
    webviews.destroy(tab.id)
  })

  tasks.destroy(id)
}

/* destroys the webview and tab element for a tab */
function destroyTab (id) {
  tabBar.removeTab(id)
  tabs.destroy(id) // remove from state - returns the index of the destroyed tab
  webviews.destroy(id) // remove the webview
}

/* destroys a task, and either switches to the next most-recent task or creates a new one */

function closeTask (taskId) {
  destroyTask(taskId)

  if (taskId === currentTask.id) {
    // the current task was destroyed, find another task to switch to

    if (tasks.get().length === 0) {
      // there are no tasks left, create a new one
      return addTask()
    } else {
      // switch to the most-recent task

      var recentTaskList = tasks.get().map(function (task) {
        return { id: task.id, lastActivity: tasks.getLastActivity(task.id) }
      })

      // sort the tasks based on how recent they are
      recentTaskList.sort(function (a, b) {
        return b.lastActivity - a.lastActivity
      })

      return switchToTask(recentTaskList[0].id)
    }
  }
}

/* destroys a tab, and either switches to the next tab or creates a new one */
function closeTab (tabId) {
  /* disabled in focus mode */
  if (focusMode.enabled()) {
    focusMode.warn()
    return
  }

  if (tabId === tabs.getSelected()) {
    var currentIndex = tabs.getIndex(tabs.getSelected())
    var nextTab = tabs.getAtIndex(currentIndex - 1) || tabs.getAtIndex(currentIndex + 1)

    destroyTab(tabId)

    if (nextTab) {
      switchToTab(nextTab.id)
    } else {
      addTab()
    }
  } else {
    destroyTab(tabId)
  }
}

/* changes the currently-selected task and updates the UI */

function switchToTask (id) {
  tasks.setSelected(id)

  tabBar.rerenderAll()

  var taskData = tasks.get(id)

  if (taskData.tabs.length > 0) {
    var selectedTab = taskData.tabs.getSelected()

    // if the task has no tab that is selected, switch to the most recent one

    if (!selectedTab) {
      selectedTab = taskData.tabs.get().sort(function (a, b) {
        return b.lastActivity - a.lastActivity
      })[0].id
    }

    switchToTab(selectedTab)
  } else {
    addTab()
  }
}

/* switches to a tab - update the webview, state, tabstrip, etc. */

function switchToTab (id, options) {
  options = options || {}

  /* tab switching disabled in focus mode */
  if (focusMode.enabled()) {
    focusMode.warn()
    return
  }

  tabBar.leaveEditMode()

  // set the tab's lastActivity to the current time

  if (tabs.getSelected()) {
    tabs.update(tabs.getSelected(), {
      lastActivity: Date.now()
    })
  }

  tabs.setSelected(id)
  tabBar.setActiveTab(id)
  webviews.setSelected(id, {
    focus: options.focusWebview !== false
  })

  updateColorPalette()

  sessionRestore.save()

  tabActivity.refresh()
}

module.exports = {navigate, addTask, addTab, destroyTask, destroyTab, closeTask, closeTab, switchToTask, switchToTab}
