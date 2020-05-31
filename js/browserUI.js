/* common actions that affect different parts of the UI (webviews, tabstrip, etc) */

var webviews = require('webviews.js')
var focusMode = require('focusMode.js')
var tabBar = require('navbar/tabBar.js')
var tabEditor = require('navbar/tabEditor.js')
var searchbar = require('searchbar/searchbar.js')

/* creates a new task */

function addTask () {
  tasks.setSelected(tasks.add())
  taskOverlay.hide()

  tabBar.rerenderAll()
  addTab()
}

/* creates a new tab */

/*
options
  options.enterEditMode - whether to enter editing mode when the tab is created. Defaults to true.
  options.openInBackground - whether to open the tab without switching to it. Defaults to false.
*/
function addTab (tabId = tabs.add(), options = {}) {
  /*
  adding a new tab should destroy the current one if either:
  * The current tab is an empty, non-private tab, and the new tab is private
  * The current tab is empty, and the new tab has a URL
  */

  if (!options.openInBackground && !tabs.get(tabs.getSelected()).url && ((!tabs.get(tabs.getSelected()).private && tabs.get(tabId).private) || tabs.get(tabId).url)) {
    destroyTab(tabs.getSelected())
  }

  tabBar.addTab(tabId)
  webviews.add(tabId)

  if (!options.openInBackground) {
    switchToTab(tabId, {
      focusWebview: options.enterEditMode === false
    })
    if (options.enterEditMode !== false) {
      tabEditor.show(tabId)
    }
  } else {
    tabBar.getTab(tabId).scrollIntoView()
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
  var previousCurrentTask = tasks.getSelected().id

  destroyTask(taskId)

  if (taskId === previousCurrentTask) {
    // the current task was destroyed, find another task to switch to

    if (tasks.getLength() === 0) {
      // there are no tasks left, create a new one
      return addTask()
    } else {
      // switch to the most-recent task

      var recentTaskList = tasks.map(function (task) {
        return { id: task.id, lastActivity: tasks.getLastActivity(task.id) }
      })

      const mostRecent = recentTaskList.reduce(
        (latest, current) => current.lastActivity > latest.lastActivity ? current : latest
      )

      return switchToTask(mostRecent.id)
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
    var nextTab =
    tabs.getAtIndex(currentIndex - 1) || tabs.getAtIndex(currentIndex + 1)

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

  if (taskData.tabs.count() > 0) {
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

  tabEditor.hide()

  tabs.setSelected(id)
  tabBar.setActiveTab(id)
  webviews.setSelected(id, {
    focus: options.focusWebview !== false
  })
}

webviews.bindEvent('new-window', function (tabId, url, frameName, disposition) {
  /* disabled in focus mode */
  if (focusMode.enabled()) {
    focusMode.warn()
    return
  }
  var newTab = tabs.add({
    url: url,
    private: tabs.get(tabId).private // inherit private status from the current tab
  })

  addTab(newTab, {
    enterEditMode: false,
    openInBackground: disposition === 'background-tab' // possibly open in background based on disposition
  })
})

webviews.bindIPC('close-window', function (tabId, args) {
  closeTab(tabId)
})

searchbar.events.on('url-selected', function (data) {
  if (data.background) {
    var newTab = tabs.add({
      url: data.url,
      private: tabs.get(tabs.getSelected()).private
    })
    addTab(newTab, {
      enterEditMode: false,
      openInBackground: true
    })
  } else {
    webviews.update(tabs.getSelected(), data.url)
    tabEditor.hide()
  }
})

tabBar.events.on('tab-selected', function (id) {
  switchToTab(id)
})

tabBar.events.on('tab-closed', function (id) {
  closeTab(id)
})

module.exports = {
  addTask,
  addTab,
  destroyTask,
  destroyTab,
  closeTask,
  closeTab,
  switchToTask,
  switchToTab
}
