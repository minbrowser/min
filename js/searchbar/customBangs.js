/* list of the available custom commands */

const { ipcRenderer } = require('electron')
const fs = require('fs')
const quickScore = require('quick-score').quickScore

const bangsPlugin = require('searchbar/bangsPlugin.js')

const webviews = require('webviews.js')
const browserUI = require('browserUI.js')
const focusMode = require('focusMode.js')
const places = require('places/places.js')
const contentBlockingToggle = require('navbar/contentBlockingToggle.js')
const taskOverlay = require('taskOverlay/taskOverlay.js')
const bookmarkConverter = require('bookmarkConverter.js')
const searchbarPlugins = require('searchbar/searchbarPlugins.js')
const tabEditor = require('navbar/tabEditor.js')
const formatRelativeDate = require('util/relativeDate.js')

function moveToTaskCommand (taskId) {
  // remove the tab from the current task

  const currentTab = tabs.get(tabs.getSelected())
  tabs.destroy(currentTab.id)

  // make sure the task has at least one tab in it
  if (tabs.count() === 0) {
    tabs.add()
  }

  const newTask = tasks.get(taskId)

  newTask.tabs.add(currentTab, { atEnd: true })

  browserUI.switchToTask(newTask.id)
  browserUI.switchToTab(currentTab.id)

  taskOverlay.show()

  setTimeout(function () {
    taskOverlay.hide()
  }, 600)
}

function switchToTaskCommand (taskId) {
  /* disabled in focus mode */
  if (focusMode.enabled()) {
    focusMode.warn()
    return
  }

  // no task was specified, show all of the tasks
  if (!taskId) {
    taskOverlay.show()
    return
  }

  browserUI.switchToTask(taskId)
}

// returns a task with the same name or index ("1" returns the first task, etc.)
function getTaskByNameOrNumber (text) {
  const textAsNumber = parseInt(text)

  return tasks.find((task, index) => (task.name && task.name.toLowerCase() === text) || index + 1 === textAsNumber
  )
}

// return an array of tasks sorted by last activity
// if a search string is present, filter the results with a basic fuzzy search
function searchAndSortTasks (text) {
  let taskResults = tasks
    .filter(t => t.id !== tasks.getSelected().id)
    .map(t => Object.assign({}, { task: t }, { lastActivity: tasks.getLastActivity(t.id) }))

  taskResults = taskResults.sort(function (a, b) {
    return b.lastActivity - a.lastActivity
  })

  if (text !== '') {
    // fuzzy search
    const searchText = text.toLowerCase()

    taskResults = taskResults.filter(function (t) {
      const task = t.task
      const taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1)).toLowerCase()
      const exactMatch = taskName.indexOf(searchText) !== -1
      const fuzzyTitleScore = quickScore(taskName, searchText)

      return (exactMatch || fuzzyTitleScore > 0.4)
    })
  }

  return taskResults
}

function initialize () {
  bangsPlugin.registerCustomBang({
    phrase: '!settings',
    snippet: l('viewSettings'),
    icon: 'carbon:settings',
    isAction: true,
    fn: function (text) {
      webviews.update(tabs.getSelected(), 'min://settings')
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!back',
    snippet: l('goBack'),
    isAction: true,
    fn: function (text) {
      webviews.callAsync(tabs.getSelected(), 'goBack')
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!forward',
    snippet: l('goForward'),
    isAction: true,
    fn: function (text) {
      webviews.callAsync(tabs.getSelected(), 'goForward')
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!screenshot',
    snippet: l('takeScreenshot'),
    icon: 'carbon:image',
    isAction: true,
    fn: function (text) {
      setTimeout(function () { // wait so that the view placeholder is hidden
        ipcRenderer.send('saveViewCapture', { id: tabs.getSelected() })
      }, 400)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!clearhistory',
    snippet: l('clearHistory'),
    icon: 'carbon:trash-can',
    isAction: true,
    fn: function (text) {
      if (confirm(l('clearHistoryConfirmation'))) {
        places.deleteAllHistory()
        ipc.invoke('clearStorageData')
      }
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!enableblocking',
    snippet: l('enableBlocking'),
    isAction: true,
    fn: function (text) {
      contentBlockingToggle.enableBlocking(tabs.get(tabs.getSelected()).url)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!disableblocking',
    snippet: l('disableBlocking'),
    isAction: true,
    fn: function (text) {
      contentBlockingToggle.disableBlocking(tabs.get(tabs.getSelected()).url)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!movetotask',
    snippet: l('moveToTask'),
    icon: 'carbon:folder-move-to',
    isAction: false,
    showSuggestions: function (text, input, event) {
      searchbarPlugins.reset('bangs')

      const taskResults = searchAndSortTasks(text)

      taskResults.forEach(function (t, idx) {
        const task = t.task
        const lastActivity = t.lastActivity

        const taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1))

        const data = {
          title: taskName,
          secondaryText: formatRelativeDate(lastActivity),
          fakeFocus: text && idx === 0,
          click: function () {
            tabEditor.hide()

            /* disabled in focus mode */
            if (focusMode.enabled()) {
              focusMode.warn()
              return
            }

            moveToTaskCommand(task.id)
          }
        }

        searchbarPlugins.addResult('bangs', data)
      })
    },

    fn: function (text) {
      /* disabled in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      // use the first search result
      // if there is no search text or no result, need to create a new task
      let task = searchAndSortTasks(text)[0]?.task
      if (!text || !task) {
        task = tasks.get(tasks.add({
          name: text
        }, tasks.getIndex(tasks.getSelected().id) + 1))
      }

      return moveToTaskCommand(task.id)
    }

  })

  bangsPlugin.registerCustomBang({
    phrase: '!task',
    snippet: l('switchToTask'),
    icon: 'carbon:folder',
    isAction: false,
    showSuggestions: function (text, input, event) {
      searchbarPlugins.reset('bangs')

      const taskResults = searchAndSortTasks(text)

      taskResults.forEach(function (t, idx) {
        const task = t.task
        const lastActivity = t.lastActivity

        const taskName = (task.name ? task.name : l('defaultTaskName').replace('%n', tasks.getIndex(task.id) + 1))

        const data = {
          title: taskName,
          secondaryText: formatRelativeDate(lastActivity),
          fakeFocus: text && idx === 0,
          click: function () {
            tabEditor.hide()
            switchToTaskCommand(task.id)
          }
        }

        searchbarPlugins.addResult('bangs', data)
      })
    },
    fn: function (text) {
      if (text) {
      // switch to the first search result
        switchToTaskCommand(searchAndSortTasks(text)[0].task.id)
      } else {
        taskOverlay.show()
      }
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!newtask',
    snippet: l('createTask'),
    icon: 'carbon:folder-add',
    isAction: true,
    fn: function (text) {
      /* disabled in focus mode */
      if (focusMode.enabled()) {
        focusMode.warn()
        return
      }

      taskOverlay.show()

      setTimeout(function () {
        browserUI.addTask()
        if (text) {
          tasks.update(tasks.getSelected().id, {name: text})
        }
      }, 600)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!closetask',
    snippet: l('closeTask'),
    icon: 'carbon:folder-off',
    isAction: false,
    fn: function (text) {
      const currentTask = tasks.getSelected()
      let taskToClose

      if (text) {
        taskToClose = getTaskByNameOrNumber(text)
      } else {
        taskToClose = tasks.getSelected()
      }

      if (taskToClose) {
        browserUI.closeTask(taskToClose.id)
        if (currentTask.id === taskToClose.id) {
          taskOverlay.show()
          setTimeout(function () {
            taskOverlay.hide()
          }, 600)
        }
      }
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!nametask',
    snippet: l('nameTask'),
    isAction: false,
    fn: function (text) {
      tasks.update(tasks.getSelected().id, {name: text})
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!importbookmarks',
    snippet: l('importBookmarks'),
    icon: 'carbon:upload',
    isAction: true,
    fn: async function () {
      const filePath = await ipc.invoke('showOpenDialog', {
        filters: [
          { name: 'HTML files', extensions: ['htm', 'html'] }
        ]
      })

      if (!filePath) {
        return
      }
      fs.readFile(filePath[0], 'utf-8', function (err, data) {
        if (err || !data) {
          console.warn(err)
          return
        }
        bookmarkConverter.import(data)
      })
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!exportbookmarks',
    snippet: l('exportBookmarks'),
    icon: 'carbon:download',
    isAction: true,
    fn: async function () {
      const data = await bookmarkConverter.exportAll()
      // save the result
      const savePath = await ipc.invoke('showSaveDialog', { defaultPath: 'bookmarks.html' })
      require('fs').writeFileSync(savePath, data)
    }
  })

  bangsPlugin.registerCustomBang({
    phrase: '!addbookmark',
    snippet: l('addBookmark'),
    icon: 'carbon:star',
    fn: function (text) {
      const url = tabs.get(tabs.getSelected()).url
      if (url) {
        places.updateItem(url, {
          isBookmarked: true,
          tags: (text ? text.split(/\s/g).map(t => t.replace('#', '').trim()) : [])
        })
      }
    }
  })
}

module.exports = { initialize }
